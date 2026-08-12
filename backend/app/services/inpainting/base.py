"""
Model-agnostic AI image-editing provider abstraction.

Astra's editor and API layer never talk to a specific AI model
directly -- they talk to this interface. Swapping in a real model
(Gemini, Flux/Fill, SDXL-Inpaint, etc.) means implementing this
interface and pointing AI_PROVIDER at it; nothing else in the
codebase changes.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class InpaintResult:
    image_bytes: bytes
    provider_name: str
    latency_ms: int


class InpaintingProviderError(Exception):
    """Raised when a provider fails to produce a result. Message is user-safe."""


class InpaintingProvider(ABC):
    """
    Implementations receive an already-validated base image, an
    OPTIONAL already-feathered binary mask (both PNG bytes, same
    dimensions when a mask is present), and a natural-language prompt,
    and return the edited image as PNG bytes.

    mask_bytes is None when the user gave an instruction without
    painting a region (e.g. "remove the man behind the two people in
    front") -- providers that support general instruction-driven
    editing (Gemini) should attempt the edit using image+prompt alone.
    Providers that are architecturally mask-only (traditional
    inpainting models like Flux Fill/SDXL Inpaint) should raise
    InpaintingProviderError with a clear message rather than silently
    ignoring the missing mask or guessing.

    Implementations must NOT log the prompt or any credentials.
    Implementations must raise InpaintingProviderError (not a bare
    Exception) on failure so the API layer can return a clean,
    user-safe error instead of leaking internals.
    """

    name: str = "unknown"

    @abstractmethod
    async def inpaint(self, image_bytes: bytes, mask_bytes: Optional[bytes], prompt: str) -> InpaintResult:
        raise NotImplementedError
