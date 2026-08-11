"""
File-handling utilities.

These helpers centralize the "never trust user input" logic for
uploads: safe id generation, extension checks, and safe filenames.
Nothing here ever uses the original filename to build a filesystem
path.
"""
from __future__ import annotations

import re
import uuid
from pathlib import Path
from typing import Optional


def generate_asset_id() -> str:
    """Generate a URL-safe, collision-resistant asset identifier."""
    return f"asset_{uuid.uuid4().hex[:12]}"


def safe_extension(filename: str) -> str:
    """Return a lowercase extension (with leading dot), or '' if none."""
    return Path(filename).suffix.lower()


def sanitize_display_name(filename: str) -> str:
    """
    Produce a display-safe version of the original filename for storing
    in metadata (NOT for use as an actual filesystem path).
    """
    name = Path(filename).name  # strip any directory components
    name = re.sub(r"[^\w\-. ]", "_", name)
    return name[:255] if name else "unnamed"


def build_storage_filename(asset_id: str, extension: str) -> str:
    """Build the filename actually used on disk: always derived from the
    generated asset id + a validated extension, never the user's name."""
    return f"{asset_id}{extension}"


def resolve_storage_path(storage_dir: Path, filename: str) -> Optional[Path]:
    """
    Resolve `filename` inside `storage_dir`, guarding against path
    traversal. Returns None if the resolved path escapes storage_dir.
    """
    candidate = (storage_dir / filename).resolve()
    storage_dir_resolved = storage_dir.resolve()
    if storage_dir_resolved not in candidate.parents and candidate != storage_dir_resolved:
        return None
    return candidate
