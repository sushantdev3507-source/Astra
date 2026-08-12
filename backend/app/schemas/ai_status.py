from __future__ import annotations

from pydantic import BaseModel


class AiStatusResponse(BaseModel):
    """
    Reports which AI provider is ACTUALLY active and whether it's
    correctly configured -- distinct from whether the backend itself
    is reachable (that's /api/v1/health). The frontend uses this to
    show "Mock AI" vs "Real AI" vs "Real AI selected but not configured"
    rather than ever assuming real AI is active just because the
    backend responds.
    """

    provider: str  # "mock" | "real" | "gemini"
    configured: bool  # for "real"/"gemini": is a credential actually present?
    model: str | None = None  # only set when configured
    supportsMaskless: bool = False  # can this provider edit without a painted mask?
