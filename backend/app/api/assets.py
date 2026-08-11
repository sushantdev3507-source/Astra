from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.schemas.asset import AssetMetadataResponse, AssetUploadResponse, AstraEditResult
from app.services.asset_service import (
    AssetValidationError,
    find_asset_file,
    get_asset_metadata,
    save_edit_result,
    store_upload,
)

router = APIRouter(prefix="/assets", tags=["assets"])


@router.post("/upload", response_model=AssetUploadResponse)
async def upload_asset(file: UploadFile) -> AssetUploadResponse:
    try:
        stored = await store_upload(file)
    except AssetValidationError as exc:
        # User-safe message only -- never leak internals/stack traces.
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return AssetUploadResponse(success=True, asset=stored.asset)


@router.get("/{asset_id}", response_model=AssetMetadataResponse)
def get_asset(asset_id: str) -> AssetMetadataResponse:
    """
    Look up a previously uploaded asset's metadata by id, without
    re-uploading. This is what an external launch (e.g. from 5onam.ai
    passing ?assetId=...) resolves against.
    """
    asset = get_asset_metadata(asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found.")
    return AssetMetadataResponse(success=True, asset=asset)


@router.get("/{asset_id}/file")
def get_asset_file(asset_id: str):
    path = find_asset_file(asset_id)
    if path is None:
        raise HTTPException(status_code=404, detail="Asset not found.")
    return FileResponse(path)


@router.post("/{asset_id}/result", response_model=AstraEditResult)
async def save_result(asset_id: str, file: UploadFile) -> AstraEditResult:
    """
    Save an exported/edited canvas as the result of an editing session.
    This is Astra's OWN save endpoint -- not a 5onam.ai production API.
    A future 5onam.ai return-flow integration can build on this shape
    once 5onam.ai's actual contract is provided.
    """
    try:
        return await save_edit_result(asset_id, file)
    except AssetValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
