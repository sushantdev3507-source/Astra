"""
Astra backend entrypoint.

Run with:
    uvicorn app.main:app --reload --port 8000
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import assets, auth, health, inpaint, jobs
from app.config import cors_settings, settings

logger = logging.getLogger("astra.main")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # See config.py's jwt_secret field -- this default is intentionally
    # obvious/insecure so it can never be mistaken for a real one.
    # Loud, impossible-to-miss warning rather than silently accepting
    # it, since a leaked/guessable JWT secret means anyone can forge a
    # valid session token for any user.
    if settings.jwt_secret == "INSECURE-DEV-ONLY-CHANGE-ME-32-BYTES-MIN":
        logger.warning(
            "ASTRA_JWT_SECRET is not set -- using the insecure default. "
            "Session tokens can be forged by anyone who knows this. "
            "Set ASTRA_JWT_SECRET to a real random value before any "
            "deployment beyond local development."
        )
    yield


app = FastAPI(
    title="Astra Backend",
    description="Backend API for Astra, Sonamai's asset editing tool.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    # Ensure a consistent, user-safe error shape and never leak stack traces.
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


API_V1_PREFIX = "/api/v1"
LEGACY_API_PREFIX = "/api"  # Sprint 1 paths, kept working for backward compatibility.

app.include_router(health.router, prefix=API_V1_PREFIX)
app.include_router(assets.router, prefix=API_V1_PREFIX)
app.include_router(inpaint.router, prefix=API_V1_PREFIX)  # AI status -- /api/v1 only
app.include_router(jobs.router, prefix=API_V1_PREFIX)  # Async AI jobs -- new in Sprint 4, /api/v1 only
app.include_router(auth.router, prefix=API_V1_PREFIX)  # Auth (placeholder in-memory store) -- /api/v1 only

app.include_router(health.router, prefix=LEGACY_API_PREFIX, include_in_schema=False)
app.include_router(assets.router, prefix=LEGACY_API_PREFIX, include_in_schema=False)


@app.get("/")
def root():
    return {"service": settings.service_name, "env": settings.env, "docs": "/docs"}
