"""
Central configuration for the Astra backend.

All environment-driven settings live here so the rest of the codebase
never reads os.environ directly. This keeps configuration testable and
makes it obvious what can be tuned via .env.
"""
from __future__ import annotations

from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="ASTRA_", extra="ignore")

    # General
    env: str = "development"
    service_name: str = "astra-backend"

    # CORS - comma separated list of allowed origins.
    # NOTE: this is read WITHOUT the ASTRA_ prefix (matches CORS_ORIGINS in .env.example)
    # handled specially below via a separate settings object.

    # Storage
    storage_dir: Path = Path("storage/uploads")
    results_dir: Path = Path("storage/results")
    max_upload_size_bytes: int = 15 * 1024 * 1024  # 15 MB

    # Allowed asset types for Sprint 1 (images only)
    allowed_image_mime_types: List[str] = [
        "image/png",
        "image/jpeg",
        "image/webp",
    ]
    allowed_image_extensions: List[str] = [".png", ".jpg", ".jpeg", ".webp"]

    # AI Edit / inpainting
    inpaint_provider: str = "mock"  # env: ASTRA_INPAINT_PROVIDER (legacy) or AI_PROVIDER (Sprint 4)
    inpaint_max_prompt_length: int = 500
    inpaint_default_feather_radius: int = 6
    inpaint_max_feather_radius: int = 40

    # Real generative AI provider (Sprint 4). Credentials are read from
    # the environment only -- never hardcoded, never logged. See
    # app/services/inpainting/real_provider.py for how these are used
    # and README.md for exact setup instructions.
    replicate_api_token: str = ""  # env: ASTRA_REPLICATE_API_TOKEN
    replicate_model_version: str = (
        "black-forest-labs/flux-fill-dev"  # Replicate model identifier for FLUX.1 Fill
    )
    real_provider_timeout_seconds: int = 120

    # Gemini image-editing provider (Gemini Integration Sprint). See
    # app/services/inpainting/gemini_provider.py for how these are used
    # and GEMINI_INTEGRATION.md for exact setup instructions.
    gemini_api_key: str = ""  # env: ASTRA_GEMINI_API_KEY
    gemini_model: str = "gemini-3.1-flash-image"

    # Pollinations image-editing provider (Pollinations Integration
    # Sprint). See app/services/inpainting/pollinations_provider.py.
    # "kontext" (Flux Kontext) is the default -- an instruction-based
    # editing model, the closest Pollinations equivalent to what this
    # pipeline needs; distinct from Pollinations' "nanobanana" model,
    # which is Gemini-based and would be redundant given we already
    # have a native Gemini provider.
    pollinations_api_key: str = ""  # env: ASTRA_POLLINATIONS_API_KEY
    pollinations_image_model: str = "kontext"  # env: ASTRA_POLLINATIONS_IMAGE_MODEL

    # Grok (xAI Imagine) image-editing provider. See
    # app/services/inpainting/grok_provider.py for how these are used.
    # Model defaults to the confirmed-API-available standard tier, NOT
    # the newer grok-imagine-image-2.0 (API access unconfirmed as of
    # its Aug 2026 release) -- see that file's module docstring.
    grok_api_key: str = ""  # env: ASTRA_GROK_API_KEY
    grok_image_model: str = "grok-imagine-image"  # env: ASTRA_GROK_IMAGE_MODEL

    # Authentication (placeholder implementation -- see
    # app/services/auth/README.md). Signs/verifies session tokens.
    # ASTRA_JWT_SECRET MUST be set to a real random value outside of
    # local development -- the default below is intentionally obvious
    # and insecure so it's impossible to mistake for a real secret; a
    # startup warning fires if it's still in use (see app/main.py).
    # Deliberately >=32 bytes even as a placeholder, since PyJWT itself
    # warns on shorter HMAC-SHA256 keys -- no reason to trigger that
    # warning on top of the already-loud startup warning below.
    jwt_secret: str = "INSECURE-DEV-ONLY-CHANGE-ME-32-BYTES-MIN"  # env: ASTRA_JWT_SECRET
    jwt_expiry_hours: int = 168  # 7 days

    # Async job processing (Sprint 4). If Redis is unreachable at
    # startup, Astra falls back to running jobs synchronously in-process
    # -- see app/jobs/store.py -- so local dev works without Redis/Celery
    # installed, per Sprint 4 Track C §15's documented-dev-mode requirement.
    # use_celery_jobs is an explicit opt-in (not just "is Redis reachable")
    # so a machine with Redis installed-but-no-worker-running doesn't
    # silently queue jobs that never get processed.
    use_celery_jobs: bool = False  # env: ASTRA_USE_CELERY_JOBS
    redis_url: str = "redis://localhost:6379/0"  # env: ASTRA_REDIS_URL
    job_result_ttl_seconds: int = 3600


class CorsSettings(BaseSettings):
    """Separate settings object because CORS_ORIGINS has no ASTRA_ prefix in .env.example."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    cors_origins: str = "http://localhost:3000"

    @property
    def origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


class AiProviderSettings(BaseSettings):
    """
    Separate settings object for AI_PROVIDER, since the Sprint 4 spec
    names it without the ASTRA_ prefix (matching CORS_ORIGINS's existing
    pattern). ASTRA_INPAINT_PROVIDER (Sprint 3) is still honored as a
    fallback for anyone with that already set.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ai_provider: str = ""  # env: AI_PROVIDER -- takes priority when set


settings = Settings()
cors_settings = CorsSettings()
ai_provider_settings = AiProviderSettings()


def resolve_provider_name() -> str:
    """AI_PROVIDER (Sprint 4 name) wins if set; otherwise falls back to
    ASTRA_INPAINT_PROVIDER (Sprint 3 name); otherwise "mock"."""
    if ai_provider_settings.ai_provider:
        return ai_provider_settings.ai_provider.lower()
    return settings.inpaint_provider.lower()

# Ensure storage directories exist at import time so upload/save routes
# never fail solely because a folder is missing.
settings.storage_dir.mkdir(parents=True, exist_ok=True)
settings.results_dir.mkdir(parents=True, exist_ok=True)
