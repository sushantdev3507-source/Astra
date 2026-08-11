"""
Pydantic schemas describing the Asset abstraction used across the API.

Astra is designed to eventually support images, PDFs and PPTX files, so
the AssetType enum and Asset schema are intentionally generic rather
than image-specific.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class AssetType(str, Enum):
    IMAGE = "image"
    PDF = "pdf"
    PPTX = "pptx"


class Asset(BaseModel):
    id: str
    type: AssetType
    name: str
    mime_type: str = Field(alias="mimeType")
    url: Optional[str] = None
    size: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None

    model_config = {"populate_by_name": True}


class AssetUploadResponse(BaseModel):
    success: bool
    asset: Optional[Asset] = None
    error: Optional[str] = None


class AssetMetadataResponse(BaseModel):
    success: bool
    asset: Optional[Asset] = None
    error: Optional[str] = None


class ResultStatus(str, Enum):
    SAVED = "saved"
    FAILED = "failed"


class AstraEditResult(BaseModel):
    """
    Result of an Astra editing session for one asset. This is Astra's
    OWN internal contract (not a 5onam.ai production API) -- it exists
    so the editor has something concrete to save to today, and so a
    future 5onam.ai return-flow integration has a stable shape to
    consume once that contract is provided.
    """

    asset_id: str = Field(alias="assetId")
    result_asset_id: str = Field(alias="resultAssetId")
    asset_type: AssetType = Field(alias="assetType")
    file_name: str = Field(alias="fileName")
    status: ResultStatus
    url: Optional[str] = None

    model_config = {"populate_by_name": True}


class HealthResponse(BaseModel):
    status: str
    service: str
