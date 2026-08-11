"""
Celery application instance, backed by Redis as both broker and result
store. This module ONLY configures Celery -- the actual work lives in
tasks.py.

To run a worker locally:
    cd backend
    celery -A app.jobs.celery_app worker --loglevel=info

Requires Redis running and reachable at ASTRA_REDIS_URL (defaults to
redis://localhost:6379/0). See README.md for full local dev setup,
including the documented no-Redis fallback for development machines
that don't have it installed.
"""
from __future__ import annotations

from celery import Celery

from app.config import settings

celery_app = Celery(
    "astra",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.jobs.tasks"],  # ensures the worker process actually imports and registers the task
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    result_expires=settings.job_result_ttl_seconds,
    task_track_started=True,
    # Inpainting can legitimately take a while against a real model;
    # don't let Celery's own defaults kill a slow-but-healthy job.
    task_time_limit=settings.real_provider_timeout_seconds + 30,
)
