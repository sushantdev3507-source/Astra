"""
Provider factory. Reads AI_PROVIDER (or the legacy ASTRA_INPAINT_PROVIDER)
from the environment and returns the matching InpaintingProvider
implementation. This is the ONLY place that decides which provider is
active -- callers elsewhere in the codebase depend only on the
InpaintingProvider interface, never on a specific implementation.

No credentials are read, invented, or logged here beyond checking
WHETHER one is configured. Provider selection NEVER silently falls
back to the mock: if a real provider is requested but its credentials
are missing, this raises a clear configuration error instead of
quietly using the mock.
"""
from __future__ import annotations

from app.config import resolve_provider_name, settings
from app.services.inpainting.base import InpaintingProvider
from app.services.inpainting.mock_provider import MockInpaintingProvider


class UnknownProviderError(Exception):
    pass


class ProviderNotConfiguredError(Exception):
    """Raised when a real provider is selected but required credentials are missing."""


def is_replicate_provider_configured() -> bool:
    return bool(settings.replicate_api_token)


def is_gemini_provider_configured() -> bool:
    return bool(settings.gemini_api_key)


# Backward-compat alias -- "real" has meant "Replicate" since Sprint 4.
is_real_provider_configured = is_replicate_provider_configured


def get_inpainting_provider() -> InpaintingProvider:
    provider_name = resolve_provider_name()

    if provider_name == "mock":
        return MockInpaintingProvider()

    if provider_name == "gemini":
        if not is_gemini_provider_configured():
            raise ProviderNotConfiguredError(
                "AI_PROVIDER=gemini is set, but ASTRA_GEMINI_API_KEY is not configured. "
                "Set it in backend/.env, or set AI_PROVIDER=mock to use the mock provider "
                "for local development. See GEMINI_INTEGRATION.md for exact setup instructions."
            )
        from app.services.inpainting.gemini_provider import GeminiImageProvider

        return GeminiImageProvider()

    if provider_name == "real":
        if not is_replicate_provider_configured():
            raise ProviderNotConfiguredError(
                "AI_PROVIDER=real is set, but ASTRA_REPLICATE_API_TOKEN is not configured. "
                "Set it in backend/.env, or set AI_PROVIDER=mock to use the mock provider "
                "for local development. See README.md for exact setup instructions."
            )
        from app.services.inpainting.real_provider import RealGenerativeAIProvider

        return RealGenerativeAIProvider()

    raise UnknownProviderError(
        f"Unknown AI_PROVIDER '{provider_name}'. Valid values: 'mock', 'gemini', 'real'."
    )
