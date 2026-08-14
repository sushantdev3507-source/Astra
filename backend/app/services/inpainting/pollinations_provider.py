"""
Real generative AI image-editing provider, via Pollinations
(gen.pollinations.ai) -- an open, OpenAI-compatible multi-model
generation platform. Uses the "kontext" model (Flux Kontext) by
default, an instruction-based image editing model.

API CONTRACT VERIFIED AGAINST CURRENT POLLINATIONS DOCUMENTATION (not
assumed from training data, per this sprint's explicit instruction):
fetched directly from github.com/pollinations/pollinations/blob/main/APIDOCS.md
at implementation time. Confirmed:
  - Base URL: https://gen.pollinations.ai
  - Auth: `Authorization: Bearer <key>` (sk_... secret key, server-side only)
  - Editing endpoint: POST /v1/images/edits (multipart/form-data),
    OpenAI Images-Edits-compatible -- fields: image (file), prompt,
    model. Returns the same CreateImageResponse shape as
    /v1/images/generations (OpenAI-compatible: {data: [{b64_json |
    url, ...}], ...}).
  - Error envelope: {"status": ..., "success": false, "error":
    {"code": ..., "message": ..., ...}}. 401 = missing/invalid key,
    402 = budget exhausted, 429/503 = rate-limited/overloaded (with a
    Retry-After header), 502 = transient upstream provider failure.

CREDENTIALS: reads ASTRA_POLLINATIONS_API_KEY from the environment.
Never logged, never accepted as a parameter from the browser, never
returned in any response.

IMPORTANT: no Pollinations API key is available in this development
environment. This adapter is implemented against Pollinations' current,
documented API contract, but live inference has NOT been executed or
verified end-to-end against the real model.

MASK HANDLING -- READ BEFORE ASSUMING THIS BEHAVES LIKE A TRUE
INPAINTING MODEL: Pollinations' documented /v1/images/edits contract
(fields: image, prompt, model) has NO mask/inpainting parameter
anywhere in the current API docs -- confirmed by inspection, not
assumed. This is an instruction + reference-image editing model (like
Gemini), not a mask-constrained inpainting model (like Flux Fill/SDXL
Inpaint). Per this sprint's explicit instruction not to fake mask
support: when a mask IS supplied, it's sent as a second reference
image with explanatory text asking the model to constrain its edit to
the white region -- the SAME best-effort-guidance pattern used for
Gemini, and equally unconfirmed to actually work, since Pollinations'
docs don't describe how (or whether) "kontext" honors a second
reference image as spatial guidance versus a style reference. This is
a real, stated limitation, not a design decision to be proud of.
"""
from __future__ import annotations

import base64
import time
from typing import Optional

import httpx

from app.config import settings
from app.services.inpainting.base import InpaintingProvider, InpaintingProviderError, InpaintResult

_POLLINATIONS_API_BASE = "https://gen.pollinations.ai"

_MASK_GUIDANCE = (
    " (A second reference image is attached as a mask: white marks the "
    "region to edit, black should stay unchanged. Please constrain the "
    "edit to the white region if possible.)"
)


class PollinationsProvider(InpaintingProvider):
    """Implements InpaintingProvider against Pollinations' OpenAI-compatible /v1/images/edits."""

    name = "pollinations"

    def __init__(self) -> None:
        if not settings.pollinations_api_key:
            # Defensive second check -- the factory must never construct
            # this class without a key already confirmed present.
            raise InpaintingProviderError("Pollinations provider selected but no API key is configured.")
        self._api_key = settings.pollinations_api_key
        self._model = settings.pollinations_image_model
        self._timeout = settings.real_provider_timeout_seconds

    async def inpaint(self, image_bytes: bytes, mask_bytes: Optional[bytes], prompt: str) -> InpaintResult:
        start = time.monotonic()

        effective_prompt = prompt + (_MASK_GUIDANCE if mask_bytes is not None else "")

        headers = {"Authorization": f"Bearer {self._api_key}"}
        data = {"prompt": effective_prompt, "model": self._model}
        files = {"image": ("image.png", image_bytes, "image/png")}
        # Pollinations' documented multipart contract only shows a
        # single `image` field in its example, but its GET /image
        # endpoint explicitly documents accepting MULTIPLE reference
        # images for models that support them (kontext included) --
        # sending the mask under the same field name, as a second
        # multipart part, is the closest honest mapping onto that
        # documented multi-image behavior for the edits endpoint.
        if mask_bytes is not None:
            files["image2"] = ("mask.png", mask_bytes, "image/png")

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(
                    f"{_POLLINATIONS_API_BASE}/v1/images/edits", headers=headers, data=data, files=files
                )
        except httpx.RequestError as exc:
            raise InpaintingProviderError("Could not reach the Pollinations API (network error).") from exc

        if resp.status_code == 401:
            raise InpaintingProviderError("Pollinations API rejected the request (invalid or missing API key).")
        if resp.status_code == 402:
            raise InpaintingProviderError("Pollinations account/API key has insufficient balance (pollen).")
        if resp.status_code == 429 or resp.status_code == 503:
            raise InpaintingProviderError("Pollinations API is rate-limited or overloaded. Please try again shortly.")
        if resp.status_code >= 400:
            detail = _extract_error_message(resp)
            raise InpaintingProviderError(f"Pollinations API returned an error (status {resp.status_code}): {detail}")

        try:
            body = resp.json()
        except ValueError as exc:
            raise InpaintingProviderError("Pollinations API returned a malformed response.") from exc

        image_data = await _extract_image_bytes(body, self._timeout)
        if image_data is None:
            raise InpaintingProviderError(
                "Pollinations did not return an edited image (unexpected response format, or the "
                "request was declined)."
            )

        latency_ms = int((time.monotonic() - start) * 1000)
        return InpaintResult(image_bytes=image_data, provider_name=self.name, latency_ms=latency_ms)


def _extract_error_message(resp: httpx.Response) -> str:
    """Pulls the human-readable message out of Pollinations' documented
    error envelope ({"error": {"message": ...}}), falling back to the
    raw response text if the body doesn't match that shape."""
    try:
        body = resp.json()
        message = body.get("error", {}).get("message")
        if message:
            return str(message)
    except (ValueError, AttributeError):
        pass
    return resp.text[:200]


async def _extract_image_bytes(response_body: dict, timeout: float) -> Optional[bytes]:
    """
    Walks the OpenAI-compatible CreateImageResponse shape
    ({"data": [{"b64_json": ...}]} or {"data": [{"url": ...}]}) and
    returns decoded image bytes -- b64_json is decoded directly; a url
    is fetched. Deliberately tolerant of either shape since the exact
    field returned by /v1/images/edits specifically (as opposed to
    /v1/images/generations, which documents both options explicitly)
    was not pinned down to one exact example in the fetched docs.
    """
    data = response_body.get("data")
    if not isinstance(data, list) or not data:
        return None
    item = data[0]
    if not isinstance(item, dict):
        return None

    b64 = item.get("b64_json")
    if b64:
        try:
            return base64.b64decode(b64)
        except (ValueError, TypeError):
            return None

    url = item.get("url")
    if url:
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                image_resp = await client.get(url)
                image_resp.raise_for_status()
                return image_resp.content
        except httpx.HTTPError:
            return None

    return None
