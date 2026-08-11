from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel

from app.schemas.inpaint import InpaintResponse


class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobCreateResponse(BaseModel):
    job_id: str
    status: JobStatus


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    result: Optional[InpaintResponse] = None
    error: Optional[str] = None
