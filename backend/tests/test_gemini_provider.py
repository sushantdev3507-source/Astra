"""
Unit tests for GeminiImageProvider. No live Gemini API key is
available in this environment (see gemini_provider.py's module
docstring) -- these tests mock the HTTP layer to verify the provider's
OWN logic (request construction, response parsing, error handling)
without depending on network access or real credentials. They do NOT
prove the live API contract is correct; they prove this code behaves
correctly against the contract as currently documented.
"""
import asyncio
import base64
import io

import httpx
import pytest
from PIL import Image

from app.services.inpainting.base import InpaintingProviderError
from app.services.inpainting.gemini_provider import GeminiImageProvider, _extract_image_bytes


def _png_bytes(color=(100, 150, 200)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (32, 24), color=color).save(buf, format="PNG")
    return buf.getvalue()


def _fake_image_response(image_bytes: bytes) -> dict:
    """A response matching the documented (post-May-2026) `steps` shape."""
    return {
        "id": "int_test123",
        "steps": [
            {
                "type": "model_output",
                "content": [
                    {"type": "text", "text": "Here's the edited image."},
                    {
                        "type": "image",
                        "mime_type": "image/png",
                        "data": base64.b64encode(image_bytes).decode("ascii"),
                    },
                ],
            }
        ],
    }


class _FakeResponse:
    def __init__(self, status_code: int, json_body: dict):
        self.status_code = status_code
        self._json_body = json_body

    def json(self):
        return self._json_body


def test_extract_image_bytes_from_steps_shape():
    """Directly tests the defensive parser against the documented response shape."""
    original = _png_bytes()
    body = _fake_image_response(original)
    extracted = _extract_image_bytes(body)
    assert extracted == original


def test_extract_image_bytes_from_flat_outputs_shape():
    """Tolerates the older/alternate flat `outputs` shape too (defensive parsing)."""
    original = _png_bytes()
    body = {
        "outputs": [
            {"type": "text", "text": "..."},
            {"type": "image", "data": base64.b64encode(original).decode("ascii")},
        ]
    }
    assert _extract_image_bytes(body) == original


def test_extract_image_bytes_returns_none_when_no_image_present():
    """Text-only response (model declined, or safety filtered) -- must not
    crash, must signal 'no image' cleanly."""
    body = {"steps": [{"type": "model_output", "content": [{"type": "text", "text": "I can't do that."}]}]}
    assert _extract_image_bytes(body) is None


def test_gemini_provider_requires_api_key(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "gemini_api_key", "")
    with pytest.raises(InpaintingProviderError):
        GeminiImageProvider()


def test_gemini_provider_sends_correct_request_shape(monkeypatch):
    """Verifies the ACTUAL HTTP request this provider builds: correct
    model, correct auth header, prompt + image (+ mask when present) in
    the input array -- this is what the sprint's 'do not implement a
    text-only call and pretend it edits the image' warning is guarding
    against; asserting the image bytes are actually in the payload
    catches exactly that mistake."""
    from app.config import settings

    monkeypatch.setattr(settings, "gemini_api_key", "fake-key-for-test")
    monkeypatch.setattr(settings, "gemini_model", "gemini-3.1-flash-image")

    captured = {}

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        return _FakeResponse(200, _fake_image_response(_png_bytes((10, 20, 30))))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = GeminiImageProvider()
    image_bytes = _png_bytes()
    result = asyncio.run(provider.inpaint(image_bytes, None, "remove the man in the background"))

    assert captured["url"].endswith("/interactions")
    assert captured["headers"]["x-goog-api-key"] == "fake-key-for-test"
    assert captured["json"]["model"] == "gemini-3.1-flash-image"

    input_parts = captured["json"]["input"]
    # The prompt text must actually be in there (not a stripped/replaced call).
    joined_text = " ".join(p["text"] for p in input_parts if p.get("type") == "text")
    assert "remove the man in the background" in joined_text
    # The actual image bytes must be in there, base64-encoded -- this is
    # the check that would fail if this were a text-only call pretending
    # to edit an image.
    image_parts = [p for p in input_parts if p.get("type") == "image"]
    assert len(image_parts) == 1  # no mask supplied -- exactly one image
    assert base64.b64decode(image_parts[0]["data"]) == image_bytes

    assert result.provider_name == "gemini"
    assert result.image_bytes == _png_bytes((10, 20, 30))


def test_gemini_provider_includes_mask_when_supplied(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "gemini_api_key", "fake-key-for-test")

    captured = {}

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        captured["json"] = json
        return _FakeResponse(200, _fake_image_response(_png_bytes()))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = GeminiImageProvider()
    image_bytes = _png_bytes()
    mask_bytes = _png_bytes((255, 255, 255))
    asyncio.run(provider.inpaint(image_bytes, mask_bytes, "add a duck here"))

    input_parts = captured["json"]["input"]
    image_parts = [p for p in input_parts if p.get("type") == "image"]
    assert len(image_parts) == 2  # base image + mask
    assert base64.b64decode(image_parts[1]["data"]) == mask_bytes


def test_gemini_provider_raises_clean_error_on_401(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "gemini_api_key", "bad-key")

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        return _FakeResponse(401, {})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = GeminiImageProvider()
    with pytest.raises(InpaintingProviderError):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))


def test_gemini_provider_raises_clean_error_when_no_image_returned(monkeypatch):
    """Text-only response (e.g. model explained why it can't do the edit)
    must surface as a clean error, never silently 'succeed' with no image."""
    from app.config import settings

    monkeypatch.setattr(settings, "gemini_api_key", "fake-key")

    async def fake_post(self, url, headers=None, json=None, **kwargs):
        return _FakeResponse(200, {"steps": [{"content": [{"type": "text", "text": "I can't help with that."}]}]})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    provider = GeminiImageProvider()
    with pytest.raises(InpaintingProviderError):
        asyncio.run(provider.inpaint(_png_bytes(), None, "edit"))
