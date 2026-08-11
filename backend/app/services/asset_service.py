"""
Asset service: validation + temporary storage for uploaded files and
saved edit results.

Sprint 1 only supported images; Sprint 2 adds a lightweight JSON
sidecar per uploaded file (name/mimeType) so an asset's metadata can
be looked up later by id -- e.g. for an external 5onam.ai launch that
references an assetId without re-uploading. This is intentionally NOT
a database (see Sprint 2 scope: no DB yet), just enough to make
id-based lookup work with local/temporary storage.
"""
from __future__ import annotations

import io
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from app.config import settings
from app.schemas.asset import Asset, AssetType, AstraEditResult, ResultStatus
from app.utils.files import (
    build_storage_filename,
    generate_asset_id,
    resolve_storage_path,
    safe_extension,
    sanitize_display_name,
)


class AssetValidationError(Exception):
    """Raised when an uploaded file fails validation. Message is user-safe."""


@dataclass
class StoredAsset:
    asset: Asset
    path: Path


# Only images are supported through Sprint 2. Mapping kept here so
# adding pdf/pptx later is a small, localized change.
_EXTENSION_TO_TYPE = {
    ".png": AssetType.IMAGE,
    ".jpg": AssetType.IMAGE,
    ".jpeg": AssetType.IMAGE,
    ".webp": AssetType.IMAGE,
}


def _determine_asset_type(extension: str, mime_type: str) -> AssetType:
    if extension in _EXTENSION_TO_TYPE and mime_type in settings.allowed_image_mime_types:
        return _EXTENSION_TO_TYPE[extension]
    raise AssetValidationError(
        "Unsupported file type. Only PNG, JPEG, and WEBP images are supported."
    )


def validate_image_bytes(data: bytes) -> tuple[Optional[int], Optional[int]]:
    """Confirm the bytes are actually a decodable image (not just a
    file with a spoofed extension) and return (width, height)."""
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
        # Re-open after verify() (verify() leaves the file unusable for further ops)
        with Image.open(io.BytesIO(data)) as img:
            width, height = img.size
        return width, height
    except (UnidentifiedImageError, OSError) as exc:
        raise AssetValidationError("File could not be read as a valid image.") from exc


def _sidecar_path(asset_id: str) -> Optional[Path]:
    return resolve_storage_path(settings.storage_dir, f"{asset_id}.json")


def _write_sidecar(asset_id: str, name: str, mime_type: str) -> None:
    path = _sidecar_path(asset_id)
    if path is None:
        return
    path.write_text(json.dumps({"name": name, "mimeType": mime_type}), encoding="utf-8")


def _read_sidecar(asset_id: str) -> Optional[dict]:
    path = _sidecar_path(asset_id)
    if path is None or not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


async def store_upload(file: UploadFile) -> StoredAsset:
    """Validate an incoming UploadFile and persist it to temporary storage.

    Raises AssetValidationError with a user-safe message on any problem.
    """
    if not file.filename:
        raise AssetValidationError("No filename provided.")

    extension = safe_extension(file.filename)
    if extension not in settings.allowed_image_extensions:
        raise AssetValidationError(
            f"Unsupported file extension '{extension or 'unknown'}'. "
            f"Allowed: {', '.join(settings.allowed_image_extensions)}."
        )

    mime_type = file.content_type or "application/octet-stream"
    asset_type = _determine_asset_type(extension, mime_type)

    data = await file.read()
    size = len(data)

    if size == 0:
        raise AssetValidationError("Uploaded file is empty.")
    if size > settings.max_upload_size_bytes:
        max_mb = settings.max_upload_size_bytes // (1024 * 1024)
        raise AssetValidationError(f"File is too large. Maximum size is {max_mb}MB.")

    width, height = validate_image_bytes(data)

    asset_id = generate_asset_id()
    storage_filename = build_storage_filename(asset_id, extension)
    storage_path = resolve_storage_path(settings.storage_dir, storage_filename)
    if storage_path is None:
        # Should be unreachable since the filename is server-generated,
        # but fail safely rather than silently writing elsewhere.
        raise AssetValidationError("Could not resolve a safe storage path.")

    storage_path.write_bytes(data)
    display_name = sanitize_display_name(file.filename)
    _write_sidecar(asset_id, display_name, mime_type)

    asset = Asset(
        id=asset_id,
        type=asset_type,
        name=display_name,
        mimeType=mime_type,
        url=f"/api/v1/assets/{asset_id}/file",
        size=size,
        width=width,
        height=height,
    )
    return StoredAsset(asset=asset, path=storage_path)


def find_asset_file(asset_id: str) -> Optional[Path]:
    """Locate a stored (uploaded OR result) file for a given asset id,
    trying known extensions. Guards against path traversal via
    resolve_storage_path."""
    if not asset_id or "/" in asset_id or "\\" in asset_id:
        return None
    for directory in (settings.storage_dir, settings.results_dir):
        for extension in settings.allowed_image_extensions:
            candidate = resolve_storage_path(directory, f"{asset_id}{extension}")
            if candidate and candidate.exists():
                return candidate
    return None


def get_asset_metadata(asset_id: str) -> Optional[Asset]:
    """
    Look up metadata for a previously uploaded asset by id, without
    re-uploading. This is what powers an external (5onam.ai) launch
    that references an assetId rather than a local file. Recomputes
    width/height from the stored file itself; reads name/mimeType from
    the sidecar JSON written at upload time, falling back to
    reasonable defaults if the sidecar is missing.
    """
    path = find_asset_file(asset_id)
    if path is None:
        return None

    sidecar = _read_sidecar(asset_id)
    extension = path.suffix.lower()
    mime_type = (sidecar or {}).get("mimeType") or _guess_mime_from_extension(extension)
    name = (sidecar or {}).get("name") or path.name

    try:
        with Image.open(path) as img:
            width, height = img.size
    except (UnidentifiedImageError, OSError):
        width, height = None, None

    return Asset(
        id=asset_id,
        type=_EXTENSION_TO_TYPE.get(extension, AssetType.IMAGE),
        name=name,
        mimeType=mime_type,
        url=f"/api/v1/assets/{asset_id}/file",
        size=path.stat().st_size,
        width=width,
        height=height,
    )


def _guess_mime_from_extension(extension: str) -> str:
    return {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }.get(extension, "application/octet-stream")


def store_result_bytes(data: bytes, extension: str = ".png") -> tuple[str, Path]:
    """
    Store raw image bytes (e.g. an AI inpainting result) as a new
    result asset and return (result_id, path). Lower-level than
    save_edit_result -- used by the inpaint endpoint, which already
    has validated PNG bytes in memory rather than an UploadFile.
    """
    if extension not in settings.allowed_image_extensions:
        raise AssetValidationError(f"Unsupported result extension '{extension}'.")
    if len(data) == 0:
        raise AssetValidationError("Result data is empty.")
    if len(data) > settings.max_upload_size_bytes:
        raise AssetValidationError("Result data is too large.")

    result_id = generate_asset_id()
    storage_filename = build_storage_filename(result_id, extension)
    storage_path = resolve_storage_path(settings.results_dir, storage_filename)
    if storage_path is None:
        raise AssetValidationError("Could not resolve a safe storage path.")

    storage_path.write_bytes(data)
    return result_id, storage_path


async def save_edit_result(source_asset_id: str, file: UploadFile) -> AstraEditResult:
    """
    Save an exported/edited canvas as the RESULT of an editing session
    for `source_asset_id`. This is Astra's own internal save endpoint,
    not a 5onam.ai production API -- see AstraEditResult docstring.
    """
    if not file.filename:
        raise AssetValidationError("No filename provided.")

    extension = safe_extension(file.filename)
    if extension not in settings.allowed_image_extensions:
        raise AssetValidationError(
            f"Unsupported result file extension '{extension or 'unknown'}'."
        )

    data = await file.read()
    if len(data) == 0:
        raise AssetValidationError("Result file is empty.")
    if len(data) > settings.max_upload_size_bytes:
        raise AssetValidationError("Result file is too large.")

    validate_image_bytes(data)

    result_id = generate_asset_id()
    storage_filename = build_storage_filename(result_id, extension)
    storage_path = resolve_storage_path(settings.results_dir, storage_filename)
    if storage_path is None:
        raise AssetValidationError("Could not resolve a safe storage path.")

    storage_path.write_bytes(data)
    display_name = sanitize_display_name(file.filename)

    return AstraEditResult(
        assetId=source_asset_id,
        resultAssetId=result_id,
        assetType=AssetType.IMAGE,
        fileName=display_name,
        status=ResultStatus.SAVED,
        url=f"/api/v1/assets/{result_id}/file",
    )
