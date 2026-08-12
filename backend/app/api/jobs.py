"""
Async AI job API (Sprint 4). Replaces Sprint 3's synchronous
POST /api/v1/inpaint (which blocked the request until the mock
provider finished) with a job-based flow:

    POST /inpaint       -> 202 Accepted, {job_id, status: "queued"}
    GET  /jobs/{job_id}  -> current status, and the result once complete

Whether this actually runs through Celery/Redis or the synchronous
dev-mode fallback is entirely decided in app/jobs/store.py -- this
router doesn't know or care which.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Form, HTTPException, UploadFile

from app.jobs.schemas import JobCreateResponse, JobStatus, JobStatusResponse
from app.jobs.store import get_job_status, submit_job
from app.services.inpaint_pipeline import InpaintPipelineError, validate_inpaint_request

router = APIRouter(tags=["ai-edit"])


@router.post("/inpaint", response_model=JobCreateResponse, status_code=202)
async def create_inpaint_job(
    image: UploadFile,
    mask: Optional[UploadFile] = None,
    prompt: str = Form(...),
    feather_radius: int = Form(default=None),
) -> JobCreateResponse:
    # Validate prompt/feather_radius synchronously, BEFORE queuing --
    # so a bad request fails immediately with a clear 400 instead of
    # silently queuing a job that's destined to fail.
    try:
        cleaned_prompt, effective_feather = validate_inpaint_request(prompt, feather_radius)
    except InpaintPipelineError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    image_bytes = await image.read()
    # mask is optional (Gemini Integration Sprint) -- an empty/absent
    # upload means an instruction-only edit with no painted region.
    mask_bytes = await mask.read() if mask is not None and mask.filename else None

    job_id = await submit_job(image_bytes, mask_bytes, cleaned_prompt, effective_feather)
    return JobCreateResponse(job_id=job_id, status=JobStatus.QUEUED)


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job(job_id: str) -> JobStatusResponse:
    status = get_job_status(job_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return status
