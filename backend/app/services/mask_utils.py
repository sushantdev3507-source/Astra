"""
Utilities for validating and preparing a binary mask before it's
handed to an inpainting provider.

Convention (explicit, per Sprint 3 requirements): WHITE (255) = region
to edit, BLACK (0) = region to preserve. Feathering softens the
boundary between the two so the AI-edited region doesn't have a harsh
cutout edge -- the ORIGINAL binary mask is never mutated in place; a
new, feathered copy is produced.
"""
from __future__ import annotations

import io
from typing import Tuple

from PIL import Image, ImageFilter, UnidentifiedImageError


class MaskValidationError(Exception):
    """Raised when a mask fails validation. Message is user-safe."""


def load_and_validate_mask(mask_bytes: bytes, expected_size: Tuple[int, int]) -> Image.Image:
    """Decode mask bytes to a grayscale ('L') image and confirm it
    matches the base image's dimensions. Raises MaskValidationError on
    any problem."""
    if len(mask_bytes) == 0:
        raise MaskValidationError("Mask file is empty.")
    try:
        mask = Image.open(io.BytesIO(mask_bytes))
        mask.verify()
        mask = Image.open(io.BytesIO(mask_bytes)).convert("L")
    except (UnidentifiedImageError, OSError) as exc:
        raise MaskValidationError("Mask could not be read as a valid image.") from exc

    if mask.size != expected_size:
        raise MaskValidationError(
            f"Mask dimensions {mask.size} do not match image dimensions {expected_size}."
        )
    return mask


def feather_mask(mask: Image.Image, feather_radius: int) -> Image.Image:
    """
    Return a NEW, softened copy of a binary mask. feather_radius <= 0
    returns an unmodified copy (feathering disabled) rather than
    mutating the input.
    """
    if feather_radius <= 0:
        return mask.copy()
    return mask.filter(ImageFilter.GaussianBlur(radius=feather_radius))


def mask_to_png_bytes(mask: Image.Image) -> bytes:
    buf = io.BytesIO()
    mask.convert("L").save(buf, format="PNG")
    return buf.getvalue()
