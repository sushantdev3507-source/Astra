"""
Unit tests for PollinationsProvider. No live Pollinations API key is
available in this environment (see pollinations_provider.py's module
docstring) -- these tests mock the HTTP layer to verify the provider's
OWN logic (request construction, response parsing, error handling)
without depending on network access or real credentials. They do NOT
prove the live API contract is correct; they prove this code behaves
correctly against the contract as currently documented (fetched live
from Pollinations' own APIDOCS.md at implementation time).

Real, paid/rate-limited API tests are intentionally NOT included here
-- see POLLINATIONS_INTEGRATION.md for how to run a manual live check
once a real ASTRA_POLLINATIONS_API_KEY is available.
"""
import asyncio
import base64
import io

import httpx
import pytest
from PIL import Image

from app.services.inpainting.base import InpaintingProviderError
from app.services.inpainting.factory import (
    get_inpainting_provider,
    is_pollinations_provider_configured,
)
from app.services.inpainting.pollinations_provider import PollinationsProvider, _extract_image_bytes


def _png_bytes(color=(100, 150, 200)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (32, 24), color=color).save(buf, format="PNG")
    return buf.getvalue()


def _b64_json_response(image_bytes: bytes) -> dict:
    """A response matching the documented OpenAI-compatible CreateImageResponse shape."""
    return {"created": 1234567890, "data": [{"b64_json": base64.b64encode(image_bytes).decode("ascii")}]}


class _FakeResponse:
    def __init__(self, status_code: int, json_body: dict, text: str = ""):
        self.status_code = status_code
        self._json_body = json_body
        self.text = text or str(json_body)

    def json(self):
        return self._json_body

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=None, response=self)


# --- 1. Initialization ---


def test_pollinations_provider_requires_api_key(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "")
    with pytest.raises(InpaintingProviderError):
        PollinationsProvider()


def test_pollinations_provider_initializes_with_key(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "sk_fake_key_for_test")
    provider = PollinationsProvider()
    assert provider.name == "pollinations"


# --- 2. is_pollinations_provider_configured() ---


def test_is_pollinations_provider_configured_reflects_settings(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "")
    assert is_pollinations_provider_configured() is False

    monkeypatch.setattr(settings, "pollinations_api_key", "sk_fake_key_for_test")
    assert is_pollinations_provider_configured() is True


# --- 3. Configurable model ---


def test_pollinations_provider_uses_configured_model(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "sk_fake_key_for_test")
    monkeypatch.setattr(settings, "pollinations_image_model", "custom-model-xyz")

    captured = {}

    async def fake_post(self, url, headers=None, data=None, files=None, **kwargs):
        captured["data"] = data
        return _FakeResponse(200, _b64_json_response(_png_bytes()))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = PollinationsProvider()
    asyncio.run(provider.inpaint(_png_bytes(), None, "edit this"))

    assert captured["data"]["model"] == "custom-model-xyz"


def test_pollinations_provider_defaults_to_kontext(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "sk_fake_key_for_test")
    # Deliberately NOT overriding pollinations_image_model -- verifies the default.
    assert settings.pollinations_image_model == "kontext"


# --- 4. Successful image-edit request ---


def test_pollinations_provider_sends_correct_request_shape(monkeypatch):
    """Verifies the ACTUAL HTTP request this provider builds: correct
    endpoint, correct auth header, correct model, and the real image
    bytes actually present in the multipart body -- catches exactly
    the 'text-only call pretending to edit the image' mistake this
    kind of test is meant to guard against."""
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "sk_fake_key_for_test")
    monkeypatch.setattr(settings, "pollinations_image_model", "kontext")

    captured = {}

    async def fake_post(self, url, headers=None, data=None, files=None, **kwargs):
        captured["url"] = url
        captured["headers"] = headers
        captured["data"] = data
        captured["files"] = files
        return _FakeResponse(200, _b64_json_response(_png_bytes((10, 20, 30))))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = PollinationsProvider()
    image_bytes = _png_bytes()
    result = asyncio.run(provider.inpaint(image_bytes, None, "remove the man in the background"))

    assert captured["url"].endswith("/v1/images/edits")
    assert captured["headers"]["Authorization"] == "Bearer sk_fake_key_for_test"
    assert captured["data"]["model"] == "kontext"
    assert "remove the man in the background" in captured["data"]["prompt"]
    # The actual image bytes must be in the multipart files, not just referenced.
    assert captured["files"]["image"][1] == image_bytes
    assert "image2" not in captured["files"]  # no mask supplied

    assert result.provider_name == "pollinations"
    assert result.image_bytes == _png_bytes((10, 20, 30))


def test_pollinations_provider_includes_mask_as_second_image_with_guidance_text(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "sk_fake_key_for_test")

    captured = {}

    async def fake_post(self, url, headers=None, data=None, files=None, **kwargs):
        captured["data"] = data
        captured["files"] = files
        return _FakeResponse(200, _b64_json_response(_png_bytes()))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = PollinationsProvider()
    mask_bytes = _png_bytes((255, 255, 255))
    asyncio.run(provider.inpaint(_png_bytes(), mask_bytes, "add a duck here"))

    assert captured["files"]["image2"][1] == mask_bytes
    # Prompt must mention the mask guidance -- this is what makes the
    # "best-effort, not a real inpainting constraint" limitation at
    # least somewhat actionable for the model.
    assert "mask" in captured["data"]["prompt"].lower()
    assert "add a duck here" in captured["data"]["prompt"]


# --- 5. API failure handling ---


def test_pollinations_provider_raises_clean_error_on_401(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "bad_key")

    async def fake_post(self, url, headers=None, data=None, files=None, **kwargs):
        return _FakeResponse(401, {"error": {"message": "invalid key"}})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = PollinationsProvider()
    with pytest.raises(InpaintingProviderError):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))


def test_pollinations_provider_raises_clean_error_on_402_insufficient_balance(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "sk_fake_key_for_test")

    async def fake_post(self, url, headers=None, data=None, files=None, **kwargs):
        return _FakeResponse(402, {"error": {"message": "insufficient balance"}})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = PollinationsProvider()
    with pytest.raises(InpaintingProviderError, match="balance"):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))


def test_pollinations_provider_raises_clean_error_on_429_rate_limit(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "sk_fake_key_for_test")

    async def fake_post(self, url, headers=None, data=None, files=None, **kwargs):
        return _FakeResponse(429, {"error": {"message": "rate limited"}})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = PollinationsProvider()
    with pytest.raises(InpaintingProviderError, match="rate-limited|overloaded"):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))


def test_pollinations_provider_network_error_raises_clean_error(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "sk_fake_key_for_test")

    async def fake_post(self, url, headers=None, data=None, files=None, **kwargs):
        raise httpx.ConnectError("connection refused")

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = PollinationsProvider()
    with pytest.raises(InpaintingProviderError, match="network"):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))


# --- 6. Invalid response handling ---


def test_pollinations_provider_raises_clean_error_when_no_image_returned(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "sk_fake_key_for_test")

    async def fake_post(self, url, headers=None, data=None, files=None, **kwargs):
        return _FakeResponse(200, {"created": 123, "data": []})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = PollinationsProvider()
    with pytest.raises(InpaintingProviderError):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))


def test_extract_image_bytes_handles_b64_json_shape():
    original = _png_bytes()
    body = _b64_json_response(original)
    extracted = asyncio.run(_extract_image_bytes(body, timeout=5))
    assert extracted == original


def test_extract_image_bytes_returns_none_for_malformed_body():
    assert asyncio.run(_extract_image_bytes({}, timeout=5)) is None
    assert asyncio.run(_extract_image_bytes({"data": "not-a-list"}, timeout=5)) is None
    assert asyncio.run(_extract_image_bytes({"data": []}, timeout=5)) is None


def test_pollinations_provider_malformed_json_response_raises_clean_error(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "sk_fake_key_for_test")

    class _BadJsonResponse(_FakeResponse):
        def json(self):
            raise ValueError("not json")

    async def fake_post(self, url, headers=None, data=None, files=None, **kwargs):
        return _BadJsonResponse(200, {})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = PollinationsProvider()
    with pytest.raises(InpaintingProviderError, match="malformed"):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))


# --- 7. Provider selection through the existing factory ---


def test_factory_selects_pollinations_provider(monkeypatch):
    from app.config import ai_provider_settings, settings

    monkeypatch.setattr(ai_provider_settings, "ai_provider", "pollinations")
    monkeypatch.setattr(settings, "pollinations_api_key", "sk_fake_key_for_test")

    provider = get_inpainting_provider()
    assert provider.name == "pollinations"


def test_factory_raises_when_pollinations_selected_without_key(monkeypatch):
    from app.config import ai_provider_settings, settings
    from app.services.inpainting.factory import ProviderNotConfiguredError

    monkeypatch.setattr(ai_provider_settings, "ai_provider", "pollinations")
    monkeypatch.setattr(settings, "pollinations_api_key", "")

    with pytest.raises(ProviderNotConfiguredError):
        get_inpainting_provider()


def test_factory_does_not_break_existing_gemini_selection(monkeypatch):
    """Adding Pollinations must not disturb the existing Gemini path."""
    from app.config import ai_provider_settings, settings

    monkeypatch.setattr(ai_provider_settings, "ai_provider", "gemini")
    monkeypatch.setattr(settings, "gemini_api_key", "fake-gemini-key")

    provider = get_inpainting_provider()
    assert provider.name == "gemini"


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
# covered by Sprint 3's regression tests; this confirms Pollinations
# doesn't introduce any NEW state that could break that.)


def test_pollinations_provider_has_no_state_that_persists_between_calls(monkeypatch):
    """Two sequential calls with DIFFERENT images/prompts must each
    send exactly their own image/prompt -- proves the provider object
    itself caches nothing from the previous call."""
    from app.config import settings

    monkeypatch.setattr(settings, "pollinations_api_key", "sk_fake_key_for_test")

    captured_calls = []

    async def fake_post(self, url, headers=None, data=None, files=None, **kwargs):
        captured_calls.append({"prompt": data["prompt"], "image": files["image"][1]})
        return _FakeResponse(200, _b64_json_response(_png_bytes()))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = PollinationsProvider()
    image_a = _png_bytes((1, 2, 3))
    image_b = _png_bytes((4, 5, 6))
    asyncio.run(provider.inpaint(image_a, None, "prompt A"))
    asyncio.run(provider.inpaint(image_b, None, "prompt B"))

    assert captured_calls[0]["prompt"] == "prompt A"
    assert captured_calls[0]["image"] == image_a
    assert captured_calls[1]["prompt"] == "prompt B"
    assert captured_calls[1]["image"] == image_b
    assert captured_calls[0]["image"] != captured_calls[1]["image"]
