"""Schemas for the AI Edit (inpainting) pipeline."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class InpaintResponse(BaseModel):
    success: bool
    result_asset_id: Optional[str] = Field(default=None, alias="resultAssetId")
    url: Optional[str] = None
    provider: Optional[str] = None
    latency_ms: Optional[int] = Field(default=None, alias="latencyMs")
    error: Optional[str] = None

    model_config = {"populate_by_name": True}
