"""
The actual background task. Image/mask bytes cross the Celery message
boundary as base64 strings (Celery's JSON serializer can't carry raw
bytes) -- see app/jobs/store.py for where that encoding happens on the
submitting side.
"""
from __future__ import annotations

import asyncio
import base64

from app.jobs.celery_app import celery_app
from app.services.inpaint_pipeline import InpaintPipelineError, run_inpaint_pipeline


@celery_app.task(name="astra.run_inpaint", bind=True)
def run_inpaint_task(self, image_b64: str, mask_b64: str, prompt: str, feather_radius: int) -> dict:
    image_bytes = base64.b64decode(image_b64)
    mask_bytes = base64.b64decode(mask_b64)

    try:
        result = asyncio.run(run_inpaint_pipeline(image_bytes, mask_bytes, prompt, feather_radius))
    except InpaintPipelineError as exc:
        # Returned (not raised) as a structured failure so the job
        # status endpoint can report a clean error without Celery's
        # own exception-serialization wrapping it in traceback noise.
        return {"success": False, "error": str(exc)}

    return {
        "success": True,
        "resultAssetId": result.result_asset_id,
        "url": result.url,
        "provider": result.provider,
        "latencyMs": result.latency_ms,
    }
