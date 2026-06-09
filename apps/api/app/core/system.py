"""System health endpoints."""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    """Response returned by system health endpoints."""

    status: Literal["ok", "ready"]


@router.get("/health", response_model=HealthResponse, summary="Liveness check")
def health() -> HealthResponse:
    """Report that the API process is running."""
    return HealthResponse(status="ok")


@router.get("/ready", response_model=HealthResponse, summary="Readiness check")
def ready() -> HealthResponse:
    """Report that the API is ready to receive requests."""
    return HealthResponse(status="ready")
