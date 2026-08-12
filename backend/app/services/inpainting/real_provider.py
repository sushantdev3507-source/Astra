"""
Real generative AI inpainting provider, via Replicate's hosted API
running FLUX.1 Fill (Black Forest Labs).

Replicate was chosen because: it hosts FLUX.1 Fill and SDXL Inpaint
(the two candidates named in Sprint 4's R&D) behind one simple,
stable REST API, requires no self-hosted GPU infrastructure, and
accepts input images/masks as base64 data URIs directly -- no need to
first upload them somewhere publicly reachable.

CREDENTIALS: reads ASTRA_REPLICATE_API_TOKEN from the environment.
This class NEVER logs the token, never accepts it as a parameter from
the browser, and never returns it in any response. If unset, the
factory (see factory.py) refuses to select this provider rather than
silently falling back to the mock -- see get_inpainting_provider().

IMPORTANT: no Replicate API token is available in this development
environment. This adapter has been implemented against Replicate's
documented, stable REST API contract, but live inference has NOT been
executed or verified end-to-end against a real model. See the Sprint 4
report for exactly what was and wasn't tested.
"""
from __future__ import annotations

import base64
import time
from typing import Optional

import httpx

from app.config import settings
from app.services.inpainting.base import InpaintingProvider, InpaintingProviderError, InpaintResult

_REPLICATE_API_BASE = "https://api.replicate.com/v1"


def _to_data_uri(data: bytes, mime_type: str = "image/png") -> str:
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


class RealGenerativeAIProvider(InpaintingProvider):
    """
    Implements InpaintingProvider against Replicate's REST API. The
    model is configured via ASTRA_REPLICATE_MODEL_VERSION (defaults to
    FLUX.1 Fill's Replicate identifier); swapping to SDXL Inpaint or
    another Replicate-hosted inpainting model is a config change, not
    a code change.
    """

    name = "real"

    def __init__(self) -> None:
        if not settings.replicate_api_token:
            # Constructing this class without a token is a programming
            # error, not a runtime/user error -- the factory must never
            # let this happen (see factory.py's explicit check). This
            # is a defensive second check, not the primary guard.
            raise InpaintingProviderError(
                "Real AI provider selected but no API token is configured."
            )
        self._token = settings.replicate_api_token
        self._model = settings.replicate_model_version
        self._timeout = settings.real_provider_timeout_seconds

    async def inpaint(self, image_bytes: bytes, mask_bytes: Optional[bytes], prompt: str) -> InpaintResult:
        if mask_bytes is None:
            # FLUX.1 Fill (and traditional inpainting models generally)
            # are architecturally mask-based -- there is no "just edit
            # based on the instruction" mode to fall back to here. This
            # is an honest limitation, not something to fake around;
            # Gemini (see gemini_provider.py) is the provider to use
            # for maskless, instruction-only edits.
            raise InpaintingProviderError(
                "This provider requires a painted mask region. Paint a mask first, "
                "or switch to the Gemini provider for instruction-only edits without a mask."
            )
        start = time.monotonic()
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
            "Prefer": "wait",  # ask Replicate to hold the connection until done, when supported
        }
        payload = {
            "input": {
                "image": _to_data_uri(image_bytes, "image/png"),
                "mask": _to_data_uri(mask_bytes, "image/png"),
                "prompt": prompt,
            }
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            try:
                create_resp = await client.post(
                    f"{_REPLICATE_API_BASE}/models/{self._model}/predictions",
                    headers=headers,
                    json=payload,
                )
                create_resp.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise InpaintingProviderError(
                    f"Real AI provider rejected the request (status {exc.response.status_code})."
                ) from exc
            except httpx.RequestError as exc:
                raise InpaintingProviderError(
                    "Could not reach the real AI provider (network error)."
                ) from exc

            prediction = create_resp.json()
            prediction_id = prediction.get("id")
            status = prediction.get("status")

            # If "Prefer: wait" wasn't honored, poll until terminal state.
            poll_deadline = time.monotonic() + self._timeout
            while status not in ("succeeded", "failed", "canceled"):
                if time.monotonic() > poll_deadline:
                    raise InpaintingProviderError("Real AI provider request timed out.")
                await self._sleep(1.0)
                try:
                    poll_resp = await client.get(
                        f"{_REPLICATE_API_BASE}/predictions/{prediction_id}", headers=headers
                    )
                    poll_resp.raise_for_status()
                except httpx.HTTPError as exc:
                    raise InpaintingProviderError(
                        "Lost contact with the real AI provider while waiting for a result."
                    ) from exc
                prediction = poll_resp.json()
                status = prediction.get("status")

            if status != "succeeded":
                error_detail = prediction.get("error") or "unknown error"
                raise InpaintingProviderError(f"Real AI generation failed: {error_detail}")

            output = prediction.get("output")
            result_url = output[0] if isinstance(output, list) else output
            if not result_url:
                raise InpaintingProviderError("Real AI provider returned no result image.")

            try:
                image_resp = await client.get(result_url)
                image_resp.raise_for_status()
            except httpx.HTTPError as exc:
                raise InpaintingProviderError(
                    "Real AI provider succeeded but the result image could not be downloaded."
                ) from exc

            latency_ms = int((time.monotonic() - start) * 1000)
            return InpaintResult(
                image_bytes=image_resp.content, provider_name=self.name, latency_ms=latency_ms
            )

    @staticmethod
    async def _sleep(seconds: float) -> None:
        import asyncio

        await asyncio.sleep(seconds)
