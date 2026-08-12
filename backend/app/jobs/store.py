"""
Job submission and status lookup, in TWO modes:

1. Celery/Redis mode (production): jobs are dispatched to a real
   Celery worker via Redis. This is what actually avoids blocking the
   HTTP request while an AI model generates.
2. Synchronous fallback mode (local dev without Redis installed): the
   pipeline runs immediately, in-process, within submit_job() itself --
   by the time submit_job() returns, the job is already
   completed/failed. It's still exposed through the exact same
   job_id -> GET /jobs/{id} contract, so the FRONTEND never needs to
   know or care which mode the backend is running in.

Which mode is active is decided ONCE, at import time, by checking
whether Redis is actually reachable. This is intentionally NOT hidden
from operators: see app/api/jobs.py's health/status wiring and
README.md for how to tell which mode is active and why.
"""
from __future__ import annotations

import base64
import logging
import uuid
from typing import Optional

from app.config import settings
from app.jobs.schemas import JobStatus, JobStatusResponse
from app.schemas.inpaint import InpaintResponse
from app.services.inpaint_pipeline import InpaintPipelineError, run_inpaint_pipeline

logger = logging.getLogger("astra.jobs")

# In-memory registry for synchronous-fallback-mode jobs only. Never
# used when Celery/Redis mode is active (Celery/Redis IS the registry
# in that case). Fine to be in-memory + non-persistent: sync mode is
# explicitly a local-dev convenience, not a production deployment mode.
_sync_job_registry: dict[str, JobStatusResponse] = {}


def _redis_reachable() -> bool:
    try:
        import redis

        client = redis.from_url(settings.redis_url, socket_connect_timeout=0.5)
        return bool(client.ping())
    except Exception:
        return False


USE_CELERY = settings.use_celery_jobs and _redis_reachable()

if settings.use_celery_jobs and not _redis_reachable():
    logger.warning(
        "ASTRA_USE_CELERY_JOBS is set but Redis is NOT reachable at %s -- "
        "falling back to synchronous in-process job processing.",
        settings.redis_url,
    )
elif USE_CELERY:
    logger.info("Using Celery for AI job processing (Redis reachable at %s).", settings.redis_url)
else:
    logger.info(
        "ASTRA_USE_CELERY_JOBS is not set -- running AI jobs synchronously in-process "
        "(development mode). Set ASTRA_USE_CELERY_JOBS=true and run a Celery worker "
        "for real async processing -- see README.md."
    )


def is_async_mode() -> bool:
    """Whether jobs are actually running through Celery/Redis (True) or the
    synchronous dev fallback (False). Exposed for the AI status endpoint."""
    return USE_CELERY


async def submit_job(image_bytes: bytes, mask_bytes: Optional[bytes], prompt: str, feather_radius: int) -> str:
    if USE_CELERY:
        from app.jobs.tasks import run_inpaint_task

        image_b64 = base64.b64encode(image_bytes).decode("ascii")
        mask_b64 = base64.b64encode(mask_bytes).decode("ascii") if mask_bytes is not None else None
        async_result = run_inpaint_task.delay(image_b64, mask_b64, prompt, feather_radius)
        return async_result.id

    # Synchronous fallback: run right now, store the outcome under a
    # generated id so GET /jobs/{id} still works identically.
    job_id = f"sync_{uuid.uuid4().hex[:16]}"
    try:
        result = await run_inpaint_pipeline(image_bytes, mask_bytes, prompt, feather_radius)
        _sync_job_registry[job_id] = JobStatusResponse(
            job_id=job_id,
            status=JobStatus.COMPLETED,
            result=InpaintResponse(
                success=True,
                resultAssetId=result.result_asset_id,
                url=result.url,
                provider=result.provider,
                latencyMs=result.latency_ms,
            ),
        )
    except InpaintPipelineError as exc:
        _sync_job_registry[job_id] = JobStatusResponse(
            job_id=job_id, status=JobStatus.FAILED, error=str(exc)
        )
    return job_id


def get_job_status(job_id: str) -> Optional[JobStatusResponse]:
    if not USE_CELERY:
        return _sync_job_registry.get(job_id)

    from celery.result import AsyncResult

    from app.jobs.celery_app import celery_app

    async_result = AsyncResult(job_id, app=celery_app)

    if async_result.state == "PENDING":
        # NOTE: Celery also reports PENDING for a job_id it has never
        # seen at all -- there's no reliable way to distinguish
        # "queued" from "unknown id" through Celery's API alone. This
        # is a documented limitation, not a bug -- see Sprint 4 report.
        return JobStatusResponse(job_id=job_id, status=JobStatus.QUEUED)

    if async_result.state == "STARTED":
        return JobStatusResponse(job_id=job_id, status=JobStatus.PROCESSING)

    if async_result.state == "SUCCESS":
        payload = async_result.result or {}
        if payload.get("success"):
            return JobStatusResponse(
                job_id=job_id,
                status=JobStatus.COMPLETED,
                result=InpaintResponse(
                    success=True,
                    resultAssetId=payload.get("resultAssetId"),
                    url=payload.get("url"),
                    provider=payload.get("provider"),
                    latencyMs=payload.get("latencyMs"),
                ),
            )
        return JobStatusResponse(job_id=job_id, status=JobStatus.FAILED, error=payload.get("error"))

    if async_result.state == "FAILURE":
        return JobStatusResponse(job_id=job_id, status=JobStatus.FAILED, error=str(async_result.result))

    # RETRY or any other Celery-internal state -- treat as still processing.
    return JobStatusResponse(job_id=job_id, status=JobStatus.PROCESSING)
