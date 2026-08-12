import io
import time

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.services.inpainting.mock_provider import MockInpaintingProvider

client = TestClient(app)


def _png_bytes(width=64, height=48, color=(120, 160, 200)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=color).save(buf, format="PNG")
    return buf.getvalue()


def _mask_bytes(width=64, height=48) -> bytes:
    """A binary mask: white square in the middle, black elsewhere."""
    mask = Image.new("L", (width, height), color=0)
    box = (width // 4, height // 4, width * 3 // 4, height * 3 // 4)
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            mask.putpixel((x, y), 255)
    buf = io.BytesIO()
    mask.save(buf, format="PNG")
    return buf.getvalue()


def _run_inpaint(image_bytes: bytes, mask_bytes: bytes, prompt: str, feather_radius=None) -> dict:
    """
    Submits a job via POST /inpaint (async job API, Sprint 4) and polls
    GET /jobs/{id} until it reaches a terminal state. In the test
    environment (ASTRA_USE_CELERY_JOBS unset), jobs run synchronously
    in-process, so this typically resolves on the first poll -- but the
    polling loop is written generically so it would also work correctly
    against a real Celery worker.
    """
    files = {"image": ("image.png", image_bytes, "image/png"), "mask": ("mask.png", mask_bytes, "image/png")}
    data = {"prompt": prompt}
    if feather_radius is not None:
        data["feather_radius"] = str(feather_radius)

    create_resp = client.post("/api/v1/inpaint", files=files, data=data)
    if create_resp.status_code != 202:
        # Synchronous validation failure (bad prompt/feather_radius) --
        # caller checks status_code/detail directly on this response.
        return {"_create_response": create_resp}

    job_id = create_resp.json()["job_id"]
    for _ in range(50):
        status_resp = client.get(f"/api/v1/jobs/{job_id}")
        assert status_resp.status_code == 200
        body = status_resp.json()
        if body["status"] in ("completed", "failed"):
            return body
        time.sleep(0.05)
    raise TimeoutError(f"Job {job_id} did not complete in time.")


def test_inpaint_valid_request_succeeds():
    job = _run_inpaint(_png_bytes(), _mask_bytes(), "make it sunset")
    assert job["status"] == "completed"
    result = job["result"]
    assert result["success"] is True
    assert result["provider"] == "mock"
    assert result["resultAssetId"]
    assert result["latencyMs"] is not None

    # The result must be fetchable like any other asset file.
    file_resp = client.get(f"/api/v1/assets/{result['resultAssetId']}/file")
    assert file_resp.status_code == 200
    result_img = Image.open(io.BytesIO(file_resp.content))
    assert result_img.size == (64, 48)


def test_inpaint_missing_prompt_rejected():
    job = _run_inpaint(_png_bytes(), _mask_bytes(), "   ")
    resp = job["_create_response"]
    assert resp.status_code == 400
    assert "Prompt" in resp.json()["detail"]


def test_inpaint_prompt_too_long_rejected():
    job = _run_inpaint(_png_bytes(), _mask_bytes(), "x" * 600)
    resp = job["_create_response"]
    assert resp.status_code == 400
    assert "too long" in resp.json()["detail"]


def test_inpaint_invalid_image_rejected():
    """Image/mask validation happens INSIDE the job pipeline (Sprint 4),
    not synchronously before queuing -- so this now surfaces as a
    failed job, not an immediate 400."""
    job = _run_inpaint(b"not a real image", _mask_bytes(), "edit")
    assert job["status"] == "failed"
    assert job["error"]


def test_inpaint_invalid_mask_rejected():
    job = _run_inpaint(_png_bytes(), b"not a real mask", "edit")
    assert job["status"] == "failed"
    assert job["error"]


def test_inpaint_mismatched_mask_dimensions_rejected():
    job = _run_inpaint(_png_bytes(64, 48), _mask_bytes(32, 24), "edit")
    assert job["status"] == "failed"
    assert "dimensions" in job["error"]


def test_inpaint_missing_image_field_rejected():
    files = {"mask": ("mask.png", _mask_bytes(), "image/png")}
    resp = client.post("/api/v1/inpaint", files=files, data={"prompt": "edit"})
    assert resp.status_code == 422  # FastAPI validation error for missing required field


def test_inpaint_without_mask_is_accepted_as_instruction_only_edit():
    """Mask is intentionally OPTIONAL (Gemini Integration Sprint) --
    omitting it is a valid instruction-only edit request (Test 5 in
    the sprint's acceptance criteria), not a validation error."""
    files = {"image": ("image.png", _png_bytes(), "image/png")}
    resp = client.post("/api/v1/inpaint", files=files, data={"prompt": "make the sky more dramatic"})
    assert resp.status_code == 202
    job_id = resp.json()["job_id"]
    for _ in range(50):
        status_resp = client.get(f"/api/v1/jobs/{job_id}")
        body = status_resp.json()
        if body["status"] in ("completed", "failed"):
            break
        time.sleep(0.05)
    assert body["status"] == "completed"
    assert body["result"]["success"] is True


def test_inpaint_feather_radius_out_of_range_rejected():
    job = _run_inpaint(_png_bytes(), _mask_bytes(), "edit", feather_radius=999)
    resp = job["_create_response"]
    assert resp.status_code == 400


def test_inpaint_is_deterministic_for_same_prompt():
    """Same image+mask+prompt should produce the same result -- this is
    a MOCK provider, and determinism is what makes it testable/demoable
    without a real model."""
    job1 = _run_inpaint(_png_bytes(), _mask_bytes(), "same prompt")
    job2 = _run_inpaint(_png_bytes(), _mask_bytes(), "same prompt")

    id1 = job1["result"]["resultAssetId"]
    id2 = job2["result"]["resultAssetId"]
    bytes1 = client.get(f"/api/v1/assets/{id1}/file").content
    bytes2 = client.get(f"/api/v1/assets/{id2}/file").content
    assert bytes1 == bytes2


def test_mock_provider_directly_produces_valid_png():
    """Unit-level test of the provider in isolation from the HTTP layer."""
    import asyncio

    provider = MockInpaintingProvider()
    result = asyncio.run(provider.inpaint(_png_bytes(), _mask_bytes(), "a red balloon"))
    assert result.provider_name == "mock"
    assert result.latency_ms >= 0
    img = Image.open(io.BytesIO(result.image_bytes))
    assert img.size == (64, 48)


# --- Regression tests: "second AI edit reuses the first edit's behavior" ---
# The backend has NO server-side session/cache of any kind -- these tests
# prove that empirically, by running two DIFFERENT (prompt) requests
# back-to-back and confirming each one's result depends ONLY on its own
# request body, never on what the previous request was.


def _sample_region_saturation(png_bytes: bytes, box: tuple[int, int, int, int]) -> float:
    """Average saturation (0-255) of a region -- used to distinguish the
    mock provider's visually-distinct prompt categories from each other."""
    img = Image.open(io.BytesIO(png_bytes)).convert("HSV")
    cropped = img.crop(box)
    s_channel = cropped.split()[1]
    pixels = list(s_channel.getdata())
    return sum(pixels) / len(pixels)


def _sample_region_hue(png_bytes: bytes, box: tuple[int, int, int, int]) -> float:
    """Average hue (0-255, PIL's HSV convention) of a region."""
    img = Image.open(io.BytesIO(png_bytes)).convert("HSV")
    cropped = img.crop(box)
    h_channel = cropped.split()[0]
    pixels = list(h_channel.getdata())
    return sum(pixels) / len(pixels)


def test_sequential_different_prompts_are_independent():
    """Two back-to-back requests with DIFFERENT prompts against the SAME
    image+mask must each reflect only their OWN prompt -- neither may
    leak into the other, in either order."""
    image = _png_bytes(80, 60, color=(180, 90, 40))  # saturated orange base
    mask = _mask_bytes(80, 60)
    region = (20, 15, 60, 45)  # matches the mask's painted box

    def run(prompt: str) -> bytes:
        job = _run_inpaint(image, mask, prompt)
        asset_id = job["result"]["resultAssetId"]
        return client.get(f"/api/v1/assets/{asset_id}/file").content

    # Order A: color request, then removal request.
    color_first = run("change the colours of this area")
    removal_second = run("remove the object")

    # Order B: same two prompts, REVERSED order, on fresh requests.
    removal_first = run("remove the object")
    color_second = run("change the colours of this area")

    # If there were any server-side state leak, a "removal" request
    # immediately following a "color" request (or vice versa) would
    # differ from the same request run in isolation/reversed order.
    # There is none -- byte-identical regardless of what ran before it.
    assert removal_second == removal_first, (
        "a 'removal' request must produce the same result regardless of "
        "what request preceded it -- if this fails, the backend is "
        "leaking state between requests"
    )
    assert color_second == color_first, (
        "a 'color' request must produce the same result regardless of "
        "what request preceded it"
    )

    # And the two categories must be VISIBLY different from each other
    # (not just byte-different) -- removal desaturates, color boosts
    # saturation, so this is a real, checkable signal, not a coincidence.
    color_saturation = _sample_region_saturation(color_first, region)
    removal_saturation = _sample_region_saturation(removal_first, region)
    assert removal_saturation < color_saturation - 20, (
        f"'remove' and 'change colours' prompts should look CLEARLY "
        f"different (removal={removal_saturation:.1f}, color={color_saturation:.1f}); "
        f"if they don't, the mock provider isn't actually prompt-sensitive"
    )


def test_three_chained_edits_each_reflect_their_own_prompt():
    """Simulates the exact repro from the bug report: edit region, then
    edit a (conceptually) different region with an unrelated prompt, a
    third time with yet another prompt -- each result must be correct
    for ITS OWN prompt category."""
    image = _png_bytes(80, 60, color=(90, 140, 200))
    mask = _mask_bytes(80, 60)
    region = (20, 15, 60, 45)

    def run(prompt: str) -> bytes:
        job = _run_inpaint(image, mask, prompt)
        asset_id = job["result"]["resultAssetId"]
        return client.get(f"/api/v1/assets/{asset_id}/file").content

    result1 = run("change the colours of this area")
    result2 = run("remove the object")
    result3 = run("enhance the sharpness here")

    sat1 = _sample_region_saturation(result1, region)
    sat2 = _sample_region_saturation(result2, region)

    assert sat2 < sat1 - 20, "edit #2 (removal) must not resemble edit #1 (color)"
    # Sanity: none of the three results are byte-identical to each other.
    assert result1 != result2 != result3 != result1


def test_generic_prompt_does_not_look_like_a_color_change():
    """Regression test for the actual reported bug: a prompt using NO
    explicit keyword (most natural-language prompts, e.g. "add a hat"
    or "make it look happier") used to fall into a fallback category
    that ALSO did a hue-shift + saturation boost -- visually
    indistinguishable from the "color" category, so almost every real
    prompt "looked like" a color change no matter what was actually
    asked for. The fallback must now be measurably different: no hue
    rotation at all (unlike a genuine color-category prompt, which
    deliberately rotates hue), so its hue should stay close to the
    ORIGINAL image's hue rather than jumping like a recolor would."""
    base_color = (90, 140, 200)
    image = _png_bytes(80, 60, color=base_color)
    mask = _mask_bytes(80, 60)
    region = (20, 15, 60, 45)
    original_hue = _sample_region_hue(image, region)

    def run(prompt: str) -> bytes:
        job = _run_inpaint(image, mask, prompt)
        asset_id = job["result"]["resultAssetId"]
        return client.get(f"/api/v1/assets/{asset_id}/file").content

    color_result = run("change the colours of this area")
    # Deliberately uses NO keyword from any explicit category -- this
    # is the exact scenario that was reported as broken.
    generic_result = run("make it look happier somehow")

    color_hue = _sample_region_hue(color_result, region)
    generic_hue = _sample_region_hue(generic_result, region)

    def hue_distance(a: float, b: float) -> float:
        # Hue wraps around at 255 in PIL's convention -- shortest distance.
        diff = abs(a - b)
        return min(diff, 255 - diff)

    color_shift = hue_distance(original_hue, color_hue)
    generic_shift = hue_distance(original_hue, generic_hue)

    assert color_shift > 20, (
        f"sanity check: the 'color' category should meaningfully rotate hue "
        f"(shift={color_shift:.1f})"
    )
    assert generic_shift < 10, (
        f"a prompt with no explicit category keyword must NOT rotate hue like "
        f"a color change (generic_shift={generic_shift:.1f}, color_shift={color_shift:.1f})"
    )


# --- Sprint 4: async job API tests ---


def test_inpaint_returns_202_with_job_id():
    files = {"image": ("image.png", _png_bytes(), "image/png"), "mask": ("mask.png", _mask_bytes(), "image/png")}
    resp = client.post("/api/v1/inpaint", files=files, data={"prompt": "edit"})
    assert resp.status_code == 202
    body = resp.json()
    assert body["job_id"]
    assert body["status"] == "queued"


def test_job_not_found_returns_404():
    resp = client.get("/api/v1/jobs/does-not-exist")
    assert resp.status_code == 404


def test_ai_status_reports_mock_by_default():
    resp = client.get("/api/v1/ai/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["provider"] == "mock"
    assert body["configured"] is True


# --- Regression tests: named colors must actually produce that color ---
# Bug report: "color this area black" produced pink instead of black.
# Root cause: the mock's "color" category picked an arbitrary
# hash-derived hue instead of reading which color was actually named,
# AND prompts like "make it blue" never even reached the color category
# in the first place (an unrelated keyword match, e.g. "make it"
# matching the "style" category, won first). Both are fixed: named-color
# detection now happens at classification time (so it can't be shadowed
# by a weaker keyword match) and is used directly as the tint target.


def _run_inpaint_for_color_test(prompt: str, base_color=(200, 120, 60)):
    image = _png_bytes(80, 60, color=base_color)
    mask = _mask_bytes(80, 60)
    job = _run_inpaint(image, mask, prompt)
    assert job["status"] == "completed", f"prompt {prompt!r} did not complete: {job}"
    asset_id = job["result"]["resultAssetId"]
    png_bytes = client.get(f"/api/v1/assets/{asset_id}/file").content
    region = (20, 15, 60, 45)
    img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    cropped = img.crop(region)
    pixels = list(cropped.getdata())
    avg = tuple(sum(c[i] for c in pixels) / len(pixels) for i in range(3))
    return avg


def test_named_color_black_produces_a_dark_result():
    r, g, b = _run_inpaint_for_color_test("color this area black")
    # Absolute-but-generous threshold, not a tight one: mask feathering
    # legitimately softens the sampled region's edges back toward the
    # original (bright orange) base color, so the region AVERAGE is
    # darker than the base but not as dark as the fully-blended center.
    assert r < 130 and g < 100 and b < 90, (
        f"'black' should read as clearly darkened vs. the orange base (200,120,60), "
        f"got rgb=({r:.0f},{g:.0f},{b:.0f})"
    )


def test_named_color_blue_is_actually_blue_not_style_category():
    """Specifically the reported failure mode: 'make it X' contains the
    word 'make it', which matches the (unrelated) style category's
    keyword list -- the named color must still win."""
    r, g, b = _run_inpaint_for_color_test("make it blue")
    assert b > r and b > g, f"'make it blue' should be blue-dominant, got rgb=({r:.0f},{g:.0f},{b:.0f})"


def test_named_color_red_reaches_color_category_with_no_color_keyword():
    """'turn this area red' contains no word from _COLOR_KEYWORDS at
    all (no 'color'/'tint'/etc.) -- previously fell through to the
    unrelated 'generic' category entirely."""
    r, g, b = _run_inpaint_for_color_test("turn this area red")
    assert r > g and r > b, f"'turn this area red' should be red-dominant, got rgb=({r:.0f},{g:.0f},{b:.0f})"


def test_removal_keyword_wins_over_incidental_color_mention():
    """'remove the red car' must stay classified as removal, not get
    hijacked into the color category just because 'red' appears."""
    image = _png_bytes(80, 60, color=(200, 120, 60))
    mask = _mask_bytes(80, 60)
    job = _run_inpaint(image, mask, "remove the red car")
    asset_id = job["result"]["resultAssetId"]
    png_bytes = client.get(f"/api/v1/assets/{asset_id}/file").content
    img = Image.open(io.BytesIO(png_bytes)).convert("HSV")
    region = (20, 15, 60, 45)
    cropped = img.crop(region)
    s_channel = cropped.split()[1]
    avg_saturation = sum(s_channel.getdata()) / len(list(s_channel.getdata()))
    # Removal desaturates heavily (see _apply_removal_style) -- a red
    # tint would instead be highly saturated. Low saturation confirms
    # "removal" won, not "color".
    assert avg_saturation < 60, (
        f"'remove the red car' should still read as a desaturated removal, "
        f"not a red tint (avg_saturation={avg_saturation:.1f})"
    )


def test_replicate_provider_rejects_maskless_request(monkeypatch):
    """Traditional inpainting models (Flux Fill) are architecturally
    mask-based -- unlike Gemini/mock, there's no instruction-only mode
    to fall back to. Must fail cleanly, not silently ignore the
    missing mask or crash."""
    import asyncio

    from app.config import settings
    from app.services.inpainting.base import InpaintingProviderError
    from app.services.inpainting.real_provider import RealGenerativeAIProvider

    monkeypatch.setattr(settings, "replicate_api_token", "fake-token-for-test")
    provider = RealGenerativeAIProvider()
    with pytest.raises(InpaintingProviderError):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))
