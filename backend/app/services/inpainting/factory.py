"""
Provider factory. Reads AI_PROVIDER (or the legacy ASTRA_INPAINT_PROVIDER)
from the environment and returns the matching InpaintingProvider
implementation. This is the ONLY place that decides which provider is
active -- callers elsewhere in the codebase depend only on the
InpaintingProvider interface, never on a specific implementation.

No credentials are read, invented, or logged here beyond checking
WHETHER one is configured. Provider selection NEVER silently falls
back to the mock: if "real" is requested but no API token is
configured, this raises a clear configuration error instead of quietly
using the mock -- per Sprint 4's explicit requirement that a user must
never be misled into thinking real AI is active when it isn't.
"""
from __future__ import annotations

from app.config import resolve_provider_name, settings
from app.services.inpainting.base import InpaintingProvider
from app.services.inpainting.mock_provider import MockInpaintingProvider


class UnknownProviderError(Exception):
    pass


class ProviderNotConfiguredError(Exception):
    """Raised when 'real' is selected but required credentials are missing."""


def is_real_provider_configured() -> bool:
    return bool(settings.replicate_api_token)


def get_inpainting_provider() -> InpaintingProvider:
    provider_name = resolve_provider_name()

    if provider_name == "mock":
        return MockInpaintingProvider()

    if provider_name == "real":
        if not is_real_provider_configured():
            raise ProviderNotConfiguredError(
                "AI_PROVIDER=real is set, but ASTRA_REPLICATE_API_TOKEN is not configured. "
                "Set it in backend/.env, or set AI_PROVIDER=mock to use the mock provider "
                "for local development. See README.md for exact setup instructions."
            )
        from app.services.inpainting.real_provider import RealGenerativeAIProvider

        return RealGenerativeAIProvider()

    raise UnknownProviderError(
        f"Unknown AI_PROVIDER '{provider_name}'. Valid values: 'mock', 'real'."
    )
