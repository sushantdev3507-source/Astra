"""
Real generative AI image-editing provider, via Google's Gemini API --
specifically gemini-3.1-flash-image ("Nano Banana"), Google's
current conversational image generation/editing model.

API CONTRACT VERIFIED AGAINST CURRENT GOOGLE DOCUMENTATION (not assumed
from training data, per this sprint's explicit instruction): as of this
implementation, Google has migrated the Gemini API from the older
generateContent REST shape to the newer Interactions API
(POST https://generativelanguage.googleapis.com/v1beta/interactions).
Image generation/editing model confirmed as gemini-3.1-flash-image via
Google's own "Image generation" and "Nano Banana image generation"
documentation pages. See GEMINI_INTEGRATION.md for citations.

CREDENTIALS: reads ASTRA_GEMINI_API_KEY from the environment. Never
logged, never accepted as a parameter from the browser, never returned
in any response.

IMPORTANT: no Gemini API key is available in this development
environment. This adapter is implemented against Google's current,
documented Interactions API contract, but live inference has NOT been
executed or verified end-to-end against the real model. Response
parsing is deliberately defensive (searches the response structure for
an image content block rather than assuming one exact fixed shape) as
extra resilience given that could not be verified live -- see
_extract_image_bytes below. See GEMINI_INTEGRATION.md for exactly what
was and wasn't tested.

MASK HANDLING: unlike traditional inpainting models (Flux Fill, SDXL
Inpaint), Gemini has no native "mask" input concept -- it's a
conversational, instruction-driven model. When a mask IS supplied
(user painted a region), it's sent as a SECOND image with explanatory
text asking the model to constrain its edit to the white region --
guidance, not a hard constraint the way a true inpainting mask is. When
no mask is supplied, the prompt alone drives the edit, exactly as this
sprint's Test 1 and Test 5 require.
"""
from __future__ import annotations

import base64
import time
from typing import Optional

import httpx

from app.config import settings
from app.services.inpainting.base import InpaintingProvider, InpaintingProviderError, InpaintResult

_GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"

_SYSTEM_GUIDANCE = (
    "You are an image editing assistant. Apply ONLY the requested change. "
    "Preserve everything else in the image exactly as it is: unaffected "
    "regions, composition, lighting, and people's faces/identities should "
    "remain unchanged unless the instruction specifically requires "
    "altering them. If a region is removed, reconstruct the background "
    "naturally and consistently with its surroundings. Do not add "
    "watermarks, borders, or text unless explicitly asked to."
)

_MASK_GUIDANCE = (
    "The second image is a mask for the first image: the WHITE region "
    "indicates where the edit should be applied; the BLACK region should "
    "be left unchanged. Use this mask to constrain the edit spatially."
)


class GeminiImageProvider(InpaintingProvider):
    """Implements InpaintingProvider against Gemini's Interactions API."""

    name = "gemini"

    def __init__(self) -> None:
        if not settings.gemini_api_key:
            # Defensive second check -- the factory must never construct
            # this class without a key already confirmed present.
            raise InpaintingProviderError("Gemini provider selected but no API key is configured.")
        self._api_key = settings.gemini_api_key
        self._model = settings.gemini_model
        self._timeout = settings.real_provider_timeout_seconds

    async def inpaint(self, image_bytes: bytes, mask_bytes: Optional[bytes], prompt: str) -> InpaintResult:
        start = time.monotonic()

        input_parts: list[dict] = [{"type": "text", "text": f"{_SYSTEM_GUIDANCE}\n\nInstruction: {prompt}"}]
        input_parts.append({
            "type": "image",
            "mime_type": "image/png",
            "data": base64.b64encode(image_bytes).decode("ascii"),
        })
        if mask_bytes is not None:
            input_parts.append({"type": "text", "text": _MASK_GUIDANCE})
            input_parts.append({
                "type": "image",
                "mime_type": "image/png",
                "data": base64.b64encode(mask_bytes).decode("ascii"),
            })

        headers = {
            "x-goog-api-key": self._api_key,
            "Content-Type": "application/json",
            # Opts into the current (post-May-2026) structured `steps`
            # response shape -- see module docstring.
            "Api-Revision": "2026-05-20",
        }
        payload = {
            "model": self._model,
            "input": input_parts,
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(f"{_GEMINI_API_BASE}/interactions", headers=headers, json=payload)
        except httpx.RequestError as exc:
            raise InpaintingProviderError("Could not reach the Gemini API (network error).") from exc

        if resp.status_code == 401 or resp.status_code == 403:
            raise InpaintingProviderError("Gemini API rejected the request (invalid or unauthorized API key).")
        if resp.status_code == 429:
            raise InpaintingProviderError("Gemini API rate limit exceeded. Please try again shortly.")
        if resp.status_code >= 400:
            raise InpaintingProviderError(f"Gemini API returned an error (status {resp.status_code}).")

        try:
            body = resp.json()
        except ValueError as exc:
            raise InpaintingProviderError("Gemini API returned a malformed response.") from exc

        image_data = _extract_image_bytes(body)
        if image_data is None:
            raise InpaintingProviderError(
                "Gemini did not return an edited image (it may have declined the request, "
                "returned only text, or the response format was unexpected)."
            )

        latency_ms = int((time.monotonic() - start) * 1000)
        return InpaintResult(image_bytes=image_data, provider_name=self.name, latency_ms=latency_ms)


def _extract_image_bytes(response_body: dict) -> Optional[bytes]:
    """
    Walks the Interactions API response looking for an image content
    block and returns its decoded bytes.

    Deliberately defensive/structure-searching rather than indexing one
    fixed path: this response shape could not be verified against a
    live call in this environment (see module docstring), so this
    tolerates minor structural variation (e.g. `steps[].content[]` vs.
    a flatter `outputs[]`) rather than being brittle against exactly
    one assumed shape.
    """
    candidates = []
    if "steps" in response_body:
        for step in response_body.get("steps") or []:
            candidates.extend(step.get("content") or [])
    if "outputs" in response_body:
        candidates.extend(response_body.get("outputs") or [])

    for item in candidates:
        if not isinstance(item, dict):
            continue
        if item.get("type") == "image":
            data = item.get("data") or item.get("inline_data", {}).get("data")
            if data:
                try:
                    return base64.b64decode(data)
                except (ValueError, TypeError):
                    continue
    return None
