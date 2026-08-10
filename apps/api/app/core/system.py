"""System health endpoints."""

from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.database import get_engine

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    """Response returned by system health endpoints."""

    status: Literal["ok", "ready"]


class ReadinessFailure(BaseModel):
    """Response returned when required dependencies are unavailable."""

    status: Literal["not_ready"]
    checks: dict[str, str]


@router.get("/health", response_model=HealthResponse, summary="Liveness check")
def health() -> HealthResponse:
    """Report that the API process is running."""
    return HealthResponse(status="ok")


@router.get("/ready", response_model=HealthResponse, summary="Readiness check")
def ready() -> HealthResponse:
    """Report that required runtime dependencies are available."""
    checks: dict[str, str] = {}

    if not settings.database_url:
        checks["database_config"] = "missing"

    cors_config_failure = _production_cors_config_failure()
    if cors_config_failure:
        checks["cors_config"] = cors_config_failure

    auth_config_missing = (
        not settings.resolved_supabase_jwks_url
        or not settings.resolved_supabase_jwt_issuer
        or not settings.supabase_jwt_audience
    )
    if auth_config_missing:
        checks["supabase_auth_config"] = "missing"

    if "database_config" not in checks:
        try:
            with get_engine().connect() as connection:
                connection.execute(text("SELECT 1"))
        except (RuntimeError, SQLAlchemyError):
            checks["database"] = "unavailable"

    if checks:
        failure = ReadinessFailure(status="not_ready", checks=checks)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=failure.model_dump(),
        )

    return HealthResponse(status="ready")


def _production_cors_config_failure() -> str:
    """Return a readiness failure reason for unsafe production CORS config."""
    if not settings.is_production:
        return ""

    if "*" in settings.cors_allowed_origins:
        return "wildcard_not_allowed"

    local_origins = ("http://localhost", "http://127.0.0.1")
    if any(
        origin.startswith(local_origins) for origin in settings.cors_allowed_origins
    ):
        return "local_origin_not_allowed"

    return ""
