"""
Model-agnostic inpainting provider abstraction.

Astra's editor and API layer never talk to a specific AI model
directly -- they talk to this interface. Swapping in a real model
(Flux/Fill, SDXL-Inpaint, etc.) later means implementing this
interface and pointing ASTRA_INPAINT_PROVIDER at it; nothing else in
the codebase changes.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class InpaintResult:
    image_bytes: bytes
    provider_name: str
    latency_ms: int


class InpaintingProviderError(Exception):
    """Raised when a provider fails to produce a result. Message is user-safe."""


class InpaintingProvider(ABC):
    """
    Implementations receive an already-validated base image, a
    already-feathered binary mask (both PNG bytes, same dimensions),
    and a prompt, and return the edited image as PNG bytes.

    Implementations must NOT log the prompt or any credentials.
    Implementations must raise InpaintingProviderError (not a bare
    Exception) on failure so the API layer can return a clean,
    user-safe error instead of leaking internals.
    """

    name: str = "unknown"

    @abstractmethod
    async def inpaint(self, image_bytes: bytes, mask_bytes: bytes, prompt: str) -> InpaintResult:
        raise NotImplementedError
