"""
The actual inpaint pipeline: validate -> feather mask -> run provider
-> store result. Extracted into one function so it's identical whether
it's invoked directly (synchronous dev-mode fallback, no Redis) or from
inside a Celery task (production async mode) -- see app/jobs/tasks.py
and app/api/jobs.py for the two callers.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.config import settings
from app.services.asset_service import AssetValidationError, store_result_bytes, validate_image_bytes
from app.services.inpainting.base import InpaintingProviderError
from app.services.inpainting.factory import ProviderNotConfiguredError, UnknownProviderError, get_inpainting_provider
from app.services.mask_utils import MaskValidationError, feather_mask, load_and_validate_mask, mask_to_png_bytes


class InpaintPipelineError(Exception):
    """User-safe error from any stage of the pipeline. Message is safe to return to the client."""


@dataclass
class InpaintPipelineResult:
    result_asset_id: str
    url: str
    provider: str
    latency_ms: int


def validate_inpaint_request(prompt: str, feather_radius: Optional[int]) -> tuple[str, int]:
    """Validates prompt + feather_radius; returns (cleaned_prompt, effective_feather_radius)."""
    prompt = (prompt or "").strip()
    if not prompt:
        raise InpaintPipelineError("Prompt cannot be empty.")
    if len(prompt) > settings.inpaint_max_prompt_length:
        raise InpaintPipelineError(
            f"Prompt is too long (max {settings.inpaint_max_prompt_length} characters)."
        )

    effective_feather = (
        feather_radius if feather_radius is not None else settings.inpaint_default_feather_radius
    )
    if effective_feather < 0 or effective_feather > settings.inpaint_max_feather_radius:
        raise InpaintPipelineError(
            f"feather_radius must be between 0 and {settings.inpaint_max_feather_radius}."
        )
    return prompt, effective_feather


async def run_inpaint_pipeline(
    image_bytes: bytes, mask_bytes: Optional[bytes], prompt: str, feather_radius: int
) -> InpaintPipelineResult:
    """
    Runs the full pipeline against ALREADY-VALIDATED prompt/feather_radius
    (call validate_inpaint_request() first, synchronously, before
    handing off to a background task -- so the user gets instant
    feedback on a bad prompt rather than waiting for a queued job to
    fail). Image/mask bytes are still validated here since they're the
    expensive/binary part appropriate for the background path.

    mask_bytes is None for an instruction-only edit (no region painted)
    -- validation/feathering is skipped entirely in that case and the
    provider receives None, exactly as it would for a real "just do
    what I asked" request. Not every provider supports this (see
    real_provider.py); that's a provider-level decision, not enforced
    here.
    """
    if len(image_bytes) == 0:
        raise InpaintPipelineError("Image is empty.")
    if len(image_bytes) > settings.max_upload_size_bytes:
        raise InpaintPipelineError("Image is too large.")
    try:
        width, height = validate_image_bytes(image_bytes)
    except AssetValidationError as exc:
        raise InpaintPipelineError(str(exc)) from exc
    if width is None or height is None:
        raise InpaintPipelineError("Could not determine image dimensions.")

    feathered_mask_bytes: Optional[bytes] = None
    if mask_bytes is not None:
        try:
            mask_image = load_and_validate_mask(mask_bytes, expected_size=(width, height))
        except MaskValidationError as exc:
            raise InpaintPipelineError(str(exc)) from exc
        feathered_mask = feather_mask(mask_image, feather_radius)
        feathered_mask_bytes = mask_to_png_bytes(feathered_mask)

    try:
        provider = get_inpainting_provider()
    except (ProviderNotConfiguredError, UnknownProviderError) as exc:
        raise InpaintPipelineError(str(exc)) from exc

    try:
        result = await provider.inpaint(image_bytes, feathered_mask_bytes, prompt)
    except InpaintingProviderError as exc:
        raise InpaintPipelineError(str(exc)) from exc

    try:
        result_id, _path = store_result_bytes(result.image_bytes, extension=".png")
    except AssetValidationError as exc:
        raise InpaintPipelineError(str(exc)) from exc

    return InpaintPipelineResult(
        result_asset_id=result_id,
        url=f"/api/v1/assets/{result_id}/file",
        provider=result.provider_name,
        latency_ms=result.latency_ms,
    )
