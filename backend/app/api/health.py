from fastapi import APIRouter

from app.config import settings
from app.schemas.asset import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service=settings.service_name)
