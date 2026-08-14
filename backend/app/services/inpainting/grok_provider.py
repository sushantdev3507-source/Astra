"""
Real generative AI image-editing provider, via xAI's Grok Imagine API.

CAPABILITY VERIFIED BEFORE IMPLEMENTATION, PER THIS SPRINT'S EXPLICIT
INSTRUCTION: confirmed via current (docs.x.ai, 2026) documentation that
Grok Imagine genuinely supports image-to-image EDITING (input image +
natural-language instruction -> edited image), not just text-to-image
generation -- these are two different capabilities and the brief
specifically warned against assuming one implies the other. The
dedicated edit endpoint, contract, and model names below were all
independently confirmed from official xAI docs, not assumed from
training data.

MODEL CHOICE: defaults to "grok-imagine-image" (the standard, cheaper
tier, $0.02/image). A newer "grok-imagine-image-2.0" shipped to xAI's
consumer apps on 2026-08-07, but developer API access for it was
still listed as "coming soon" as of that release -- NOT defaulted to,
since it isn't confirmed callable via this API yet. The higher-quality
"grok-imagine-image-quality" tier is available today and can be
selected via ASTRA_GROK_IMAGE_MODEL without any code change.

API CONTRACT (confirmed against docs.x.ai at implementation time):
  - Base URL: https://api.x.ai
  - Auth: `Authorization: Bearer <key>` (XAI_API_KEY), server-side only
  - Editing endpoint: POST /v1/images/edits -- JSON body (NOT
    multipart/form-data; xAI's docs explicitly note the OpenAI SDK's
    multipart images.edit() call is NOT compatible with this API for
    that reason -- this adapter sends raw JSON accordingly).
    Single-image field: {"model", "prompt", "image": {"url", "type":
    "image_url"}}. Multi-image (up to 3 references) uses "images": [...]
    instead of "image". The "url" field accepts a data: URI directly
    (no separate base64 field/type needed) -- used here rather than
    hosting the image somewhere public first.
  - Response: {"data": [{"url": ..., "mime_type": ..., "revised_prompt":
    ...}], "usage": {...}}. Documented example returns a URL, not
    inline base64; this adapter fetches that URL. Also defensively
    checks for a b64_json field in case the edits endpoint honors the
    generation endpoint's documented response_format=b64_json option,
    which was not explicitly re-confirmed for /edits specifically.

CREDENTIALS: reads ASTRA_GROK_API_KEY from the environment. Never
logged, never accepted as a parameter from the browser, never returned
in any response.

IMPORTANT: no Grok/xAI API key is available in this development
environment. This adapter is implemented against xAI's current,
documented API contract, but live inference has NOT been executed or
verified end-to-end against the real model.

MASK HANDLING -- READ BEFORE ASSUMING THIS BEHAVES LIKE A TRUE
INPAINTING MODEL: xAI's documented image-editing contract supports up
to 3 REFERENCE images for multi-subject compositing (e.g. "put these
two people together in one scene") -- nothing in the current docs
describes a reference image being treated as a spatial mask/inpainting
constraint. Per this sprint's explicit instruction not to fake mask
support: when a mask IS supplied, it's sent as a second image in the
"images" array with explanatory text asking the model to constrain its
edit to the white region -- the SAME best-effort-guidance pattern used
for Gemini and Pollinations, and equally unconfirmed to actually work
this way, since xAI's docs don't describe how (or whether) the model
interprets a second image as a mask versus a compositing reference.
This is a real, stated limitation, not a design decision to be proud of.
"""
from __future__ import annotations

import base64
import time
from typing import Optional

import httpx

from app.config import settings
from app.services.inpainting.base import InpaintingProvider, InpaintingProviderError, InpaintResult

_XAI_API_BASE = "https://api.x.ai"

_MASK_GUIDANCE = (
    " (A second image is attached as a mask: white marks the region to "
    "edit, black should stay unchanged. Please constrain the edit to the "
    "white region if possible.)"
)


def _to_data_uri(image_bytes: bytes) -> str:
    return f"data:image/png;base64,{base64.b64encode(image_bytes).decode('ascii')}"


class GrokImageProvider(InpaintingProvider):
    """Implements InpaintingProvider against xAI's Grok Imagine /v1/images/edits."""

    name = "grok"

    def __init__(self) -> None:
        if not settings.grok_api_key:
            # Defensive second check -- the factory must never construct
            # this class without a key already confirmed present.
            raise InpaintingProviderError("Grok provider selected but no API key is configured.")
        self._api_key = settings.grok_api_key
        self._model = settings.grok_image_model
        self._timeout = settings.real_provider_timeout_seconds

    async def inpaint(self, image_bytes: bytes, mask_bytes: Optional[bytes], prompt: str) -> InpaintResult:
        start = time.monotonic()

        effective_prompt = prompt + (_MASK_GUIDANCE if mask_bytes is not None else "")
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        if mask_bytes is not None:
            payload = {
                "model": self._model,
                "prompt": effective_prompt,
                "images": [
                    {"type": "image_url", "url": _to_data_uri(image_bytes)},
                    {"type": "image_url", "url": _to_data_uri(mask_bytes)},
                ],
            }
        else:
            payload = {
                "model": self._model,
                "prompt": effective_prompt,
                "image": {"type": "image_url", "url": _to_data_uri(image_bytes)},
            }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(f"{_XAI_API_BASE}/v1/images/edits", headers=headers, json=payload)
        except httpx.RequestError as exc:
            raise InpaintingProviderError("Could not reach the Grok (xAI) API (network error).") from exc

        if resp.status_code == 401 or resp.status_code == 403:
            raise InpaintingProviderError("Grok API rejected the request (invalid or unauthorized API key).")
        if resp.status_code == 429:
            raise InpaintingProviderError("Grok API rate limit exceeded. Please try again shortly.")
        if resp.status_code >= 400:
            detail = _extract_error_message(resp)
            raise InpaintingProviderError(f"Grok API returned an error (status {resp.status_code}): {detail}")

        try:
            body = resp.json()
        except ValueError as exc:
            raise InpaintingProviderError("Grok API returned a malformed response.") from exc

        image_data = await _extract_image_bytes(body, self._timeout)
        if image_data is None:
            raise InpaintingProviderError(
                "Grok did not return an edited image (unexpected response format, or the "
                "request was declined)."
            )

        latency_ms = int((time.monotonic() - start) * 1000)
        return InpaintResult(image_bytes=image_data, provider_name=self.name, latency_ms=latency_ms)


def _extract_error_message(resp: httpx.Response) -> str:
    try:
        body = resp.json()
        message = body.get("error", {}).get("message") if isinstance(body.get("error"), dict) else body.get("error")
        if message:
            return str(message)
    except (ValueError, AttributeError):
        pass
    return resp.text[:200]


async def _extract_image_bytes(response_body: dict, timeout: float) -> Optional[bytes]:
    """
    Walks xAI's documented {"data": [{"url"|"b64_json": ...}]} response
    shape and returns decoded image bytes -- a url is fetched, a
    b64_json (if present) is decoded directly. Deliberately checks
    both since the /edits endpoint's documented example only showed
    "url", while the sibling /generations endpoint documents an
    optional response_format=b64_json this adapter doesn't rely on but
    tolerates if xAI honors it for edits too.
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
