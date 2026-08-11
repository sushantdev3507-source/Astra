"""
GET /ai/status (mounted at /api/v1/ai/status)

Reports which AI provider is actually active and whether it's
correctly configured. The actual inpaint job submission/status
endpoints live in app/api/jobs.py (Sprint 4 replaced the Sprint 3
synchronous POST /inpaint with an async job flow -- see that module).
"""
from __future__ import annotations

from fastapi import APIRouter

from app.config import resolve_provider_name, settings
from app.jobs.store import is_async_mode
from app.schemas.ai_status import AiStatusResponse
from app.services.inpainting.factory import is_real_provider_configured

router = APIRouter(tags=["ai-edit"])


@router.get("/ai/status", response_model=AiStatusResponse)
def ai_status() -> AiStatusResponse:
    provider = resolve_provider_name()
    if provider == "real":
        return AiStatusResponse(
            provider="real",
            configured=is_real_provider_configured(),
            model=settings.replicate_model_version if is_real_provider_configured() else None,
        )
    return AiStatusResponse(provider="mock", configured=True, model=None)


@router.get("/jobs-mode")
def jobs_mode() -> dict:
    """Whether AI jobs are running through real Celery/Redis or the
    synchronous dev-mode fallback -- surfaced for debugging/ops, not
    something the editor UI needs to branch on."""
    return {"async_mode": is_async_mode()}
