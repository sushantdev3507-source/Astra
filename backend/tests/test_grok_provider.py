"""
Unit tests for GrokImageProvider. No live xAI API key is available in
this environment (see grok_provider.py's module docstring) -- these
tests mock the HTTP layer to verify the provider's OWN logic (request
construction, response parsing, error handling) without depending on
network access or real credentials. They do NOT prove the live API
contract is correct; they prove this code behaves correctly against
the contract as currently documented (confirmed live from docs.x.ai
at implementation time).

Real, paid/rate-limited API tests are intentionally NOT included here
-- see GROK_INTEGRATION.md for how to run a manual live check once a
real ASTRA_GROK_API_KEY is available.
"""
import asyncio
import base64
import io

import httpx
import pytest
from PIL import Image

from app.services.inpainting.base import InpaintingProviderError
from app.services.inpainting.factory import get_inpainting_provider, is_grok_provider_configured
from app.services.inpainting.grok_provider import GrokImageProvider, _extract_image_bytes


def _png_bytes(color=(100, 150, 200)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (32, 24), color=color).save(buf, format="PNG")
    return buf.getvalue()


def _url_response(image_url: str) -> dict:
    """A response matching xAI's documented /v1/images/edits example shape."""
    return {"data": [{"url": image_url, "mime_type": "image/jpeg", "revised_prompt": ""}], "usage": {}}


def _b64_json_response(image_bytes: bytes) -> dict:
    return {"data": [{"b64_json": base64.b64encode(image_bytes).decode("ascii")}], "usage": {}}


class _FakeResponse:
    def __init__(self, status_code: int, json_body: dict, text: str = "", content: bytes = b""):
        self.status_code = status_code
        self._json_body = json_body
        self.text = text or str(json_body)
        self.content = content

    def json(self):
        return self._json_body

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=None, response=self)


# --- 1. Initialization ---


def test_grok_provider_requires_api_key(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "")
    with pytest.raises(InpaintingProviderError):
        GrokImageProvider()


def test_grok_provider_initializes_with_key(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "fake-key-for-test")
    provider = GrokImageProvider()
    assert provider.name == "grok"


# --- 2. is_grok_provider_configured() ---


def test_is_grok_provider_configured_reflects_settings(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "")
    assert is_grok_provider_configured() is False

    monkeypatch.setattr(settings, "grok_api_key", "fake-key-for-test")
    assert is_grok_provider_configured() is True


# --- 3. Configurable model ---


def test_grok_provider_uses_configured_model(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "fake-key-for-test")
    monkeypatch.setattr(settings, "grok_image_model", "grok-imagine-image-quality")

    captured = {}

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        captured["json"] = json
        return _FakeResponse(200, _b64_json_response(_png_bytes()))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = GrokImageProvider()
    asyncio.run(provider.inpaint(_png_bytes(), None, "edit this"))

    assert captured["json"]["model"] == "grok-imagine-image-quality"


def test_grok_provider_defaults_to_standard_tier_not_2_0(monkeypatch):
    """Must default to the confirmed-API-available model, not
    grok-imagine-image-2.0 (API access unconfirmed as of its release --
    see the module docstring)."""
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "fake-key-for-test")
    # Deliberately NOT overriding grok_image_model -- verifies the default.
    assert settings.grok_image_model == "grok-imagine-image"
    assert "2.0" not in settings.grok_image_model


# --- 4. Successful image-edit request ---


def test_grok_provider_sends_correct_request_shape(monkeypatch):
    """Verifies the ACTUAL HTTP request this provider builds: correct
    endpoint, JSON (not multipart) content, correct auth header,
    correct model, and the real image bytes actually present (as a
    data URI) -- catches exactly the 'text-only call pretending to
    edit the image' mistake this kind of test is meant to guard
    against."""
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "fake-key-for-test")
    monkeypatch.setattr(settings, "grok_image_model", "grok-imagine-image")

    captured = {}

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        return _FakeResponse(200, _b64_json_response(_png_bytes((10, 20, 30))))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = GrokImageProvider()
    image_bytes = _png_bytes()
    result = asyncio.run(provider.inpaint(image_bytes, None, "remove the man in the background"))

    assert captured["url"].endswith("/v1/images/edits")
    assert captured["headers"]["Authorization"] == "Bearer fake-key-for-test"
    assert captured["headers"]["Content-Type"] == "application/json"  # NOT multipart -- xAI-specific requirement
    assert captured["json"]["model"] == "grok-imagine-image"
    assert "remove the man in the background" in captured["json"]["prompt"]
    # The actual image bytes must be embedded as a base64 data URI, not
    # just referenced by filename.
    assert captured["json"]["image"]["type"] == "image_url"
    data_uri = captured["json"]["image"]["url"]
    assert data_uri.startswith("data:image/png;base64,")
    embedded_bytes = base64.b64decode(data_uri.split(",", 1)[1])
    assert embedded_bytes == image_bytes
    assert "images" not in captured["json"]  # single-image field used, not the multi-image array

    assert result.provider_name == "grok"
    assert result.image_bytes == _png_bytes((10, 20, 30))


def test_grok_provider_includes_mask_as_second_image_in_images_array(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "fake-key-for-test")

    captured = {}

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        captured["json"] = json
        return _FakeResponse(200, _b64_json_response(_png_bytes()))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = GrokImageProvider()
    image_bytes = _png_bytes()
    mask_bytes = _png_bytes((255, 255, 255))
    asyncio.run(provider.inpaint(image_bytes, mask_bytes, "add a duck here"))

    assert "image" not in captured["json"]  # multi-image path uses "images", not singular "image"
    images = captured["json"]["images"]
    assert len(images) == 2
    assert base64.b64decode(images[0]["url"].split(",", 1)[1]) == image_bytes
    assert base64.b64decode(images[1]["url"].split(",", 1)[1]) == mask_bytes
    # Prompt must mention the mask guidance -- this is what makes the
    # "best-effort, not a real inpainting constraint" limitation at
    # least somewhat actionable for the model.
    assert "mask" in captured["json"]["prompt"].lower()
    assert "add a duck here" in captured["json"]["prompt"]


# --- 5. API failure handling ---


def test_grok_provider_raises_clean_error_on_401(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "bad-key")

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        return _FakeResponse(401, {"error": "invalid key"})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = GrokImageProvider()
    with pytest.raises(InpaintingProviderError):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))


def test_grok_provider_raises_clean_error_on_429_rate_limit(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "fake-key-for-test")

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        return _FakeResponse(429, {"error": "rate limited"})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = GrokImageProvider()
    with pytest.raises(InpaintingProviderError, match="rate limit"):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))


def test_grok_provider_network_error_raises_clean_error(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "fake-key-for-test")

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        raise httpx.ConnectError("connection refused")

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = GrokImageProvider()
    with pytest.raises(InpaintingProviderError, match="network"):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))


# --- 6. Invalid response handling ---


def test_grok_provider_raises_clean_error_when_no_image_returned(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "fake-key-for-test")

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        return _FakeResponse(200, {"data": [], "usage": {}})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = GrokImageProvider()
    with pytest.raises(InpaintingProviderError):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))


def test_grok_provider_fetches_image_when_response_is_a_url(monkeypatch):
    """xAI's documented /edits example returns a URL, not inline
    base64 -- this is the primary documented response shape, so it
    must be the one that actually works, not just the b64_json
    fallback."""
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "fake-key-for-test")
    expected_bytes = _png_bytes((7, 8, 9))

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        return _FakeResponse(200, _url_response("https://imgen.x.ai/xai-imgen/fake-result.jpeg"))

    async def fake_get(self, url, **kwargs):
        assert url == "https://imgen.x.ai/xai-imgen/fake-result.jpeg"
        return _FakeResponse(200, {}, content=expected_bytes)

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    provider = GrokImageProvider()
    result = asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))
    assert result.image_bytes == expected_bytes


def test_extract_image_bytes_handles_b64_json_shape():
    original = _png_bytes()
    body = _b64_json_response(original)
    extracted = asyncio.run(_extract_image_bytes(body, timeout=5))
    assert extracted == original


def test_extract_image_bytes_returns_none_for_malformed_body():
    assert asyncio.run(_extract_image_bytes({}, timeout=5)) is None
    assert asyncio.run(_extract_image_bytes({"data": "not-a-list"}, timeout=5)) is None
    assert asyncio.run(_extract_image_bytes({"data": []}, timeout=5)) is None


def test_grok_provider_malformed_json_response_raises_clean_error(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "fake-key-for-test")

    class _BadJsonResponse(_FakeResponse):
        def json(self):
            raise ValueError("not json")

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        return _BadJsonResponse(200, {})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = GrokImageProvider()
    with pytest.raises(InpaintingProviderError, match="malformed"):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))


# --- 7. Provider selection through the existing factory ---


def test_factory_selects_grok_provider(monkeypatch):
    from app.config import ai_provider_settings, settings

    monkeypatch.setattr(ai_provider_settings, "ai_provider", "grok")
    monkeypatch.setattr(settings, "grok_api_key", "fake-key-for-test")

    provider = get_inpainting_provider()
    assert provider.name == "grok"


def test_factory_raises_when_grok_selected_without_key(monkeypatch):
    from app.config import ai_provider_settings, settings
    from app.services.inpainting.factory import ProviderNotConfiguredError

    monkeypatch.setattr(ai_provider_settings, "ai_provider", "grok")
    monkeypatch.setattr(settings, "grok_api_key", "")

    with pytest.raises(ProviderNotConfiguredError):
        get_inpainting_provider()


def test_factory_does_not_break_existing_gemini_or_pollinations_selection(monkeypatch):
    """Adding Grok must not disturb the existing Gemini/Pollinations paths."""
    from app.config import ai_provider_settings, settings

    monkeypatch.setattr(ai_provider_settings, "ai_provider", "gemini")
    monkeypatch.setattr(settings, "gemini_api_key", "fake-gemini-key")
    assert get_inpainting_provider().name == "gemini"

    monkeypatch.setattr(ai_provider_settings, "ai_provider", "pollinations")
    monkeypatch.setattr(settings, "pollinations_api_key", "fake-pollinations-key")
    assert get_inpainting_provider().name == "pollinations"


def test_factory_still_defaults_to_mock_when_unset(monkeypatch):
    from app.config import ai_provider_settings, settings

    monkeypatch.setattr(ai_provider_settings, "ai_provider", "")
    monkeypatch.setattr(settings, "inpaint_provider", "mock")

    provider = get_inpainting_provider()
    assert provider.name == "mock"


# --- 8. Current-image propagation between consecutive AI edits ---
# (Verifies the provider layer has no per-call state that could leak
# between requests -- the actual "current image becomes next source"
# behavior lives in the engine/baseImageOverride mechanism, already
# covered by Sprint 3's regression tests; this confirms Grok doesn't
# introduce any NEW state that could break that.)


def test_grok_provider_has_no_state_that_persists_between_calls(monkeypatch):
    """Two sequential calls with DIFFERENT images/prompts must each
    send exactly their own image/prompt -- proves the provider object
    itself caches nothing from the previous call."""
    from app.config import settings

    monkeypatch.setattr(settings, "grok_api_key", "fake-key-for-test")

    captured_calls = []

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        captured_calls.append({"prompt": json["prompt"], "image_uri": json["image"]["url"]})
        return _FakeResponse(200, _b64_json_response(_png_bytes()))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = GrokImageProvider()
    image_a = _png_bytes((1, 2, 3))
    image_b = _png_bytes((4, 5, 6))
    asyncio.run(provider.inpaint(image_a, None, "prompt A"))
    asyncio.run(provider.inpaint(image_b, None, "prompt B"))

    assert captured_calls[0]["prompt"] == "prompt A"
    assert captured_calls[1]["prompt"] == "prompt B"
    assert captured_calls[0]["image_uri"] != captured_calls[1]["image_uri"]
