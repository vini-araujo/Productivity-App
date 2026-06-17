"""Tests for system health endpoints."""

import httpx
import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.core import database, system
from app.main import app


@pytest.mark.anyio
async def test_health_returns_ok() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.anyio
async def test_ready_returns_ready_when_dependencies_are_available(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(system.settings, "database_url", "sqlite:///:memory:")
    monkeypatch.setattr(system.settings, "supabase_url", "https://example.supabase.co")
    monkeypatch.setattr(system.settings, "supabase_jwks_url", "")
    monkeypatch.setattr(system.settings, "supabase_jwt_issuer", "")
    monkeypatch.setattr(system.settings, "supabase_jwt_audience", "authenticated")
    database.get_engine.cache_clear()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}

    database.get_engine.cache_clear()


@pytest.mark.anyio
async def test_ready_reports_missing_required_configuration(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(system.settings, "database_url", "")
    monkeypatch.setattr(system.settings, "supabase_url", "")
    monkeypatch.setattr(system.settings, "supabase_jwks_url", "")
    monkeypatch.setattr(system.settings, "supabase_jwt_issuer", "")
    monkeypatch.setattr(system.settings, "supabase_jwt_audience", "")
    database.get_engine.cache_clear()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/ready")

    assert response.status_code == 503
    assert response.json() == {
        "detail": {
            "status": "not_ready",
            "checks": {
                "database_config": "missing",
                "supabase_auth_config": "missing",
            },
        },
    }


@pytest.mark.anyio
async def test_ready_reports_database_connection_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def raise_database_error() -> None:
        raise SQLAlchemyError("database unavailable")

    monkeypatch.setattr(system.settings, "database_url", "postgresql://host/db")
    monkeypatch.setattr(system.settings, "supabase_url", "https://example.supabase.co")
    monkeypatch.setattr(system.settings, "supabase_jwt_audience", "authenticated")
    monkeypatch.setattr(system, "get_engine", raise_database_error)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/ready")

    assert response.status_code == 503
    assert response.json() == {
        "detail": {
            "status": "not_ready",
            "checks": {
                "database": "unavailable",
            },
        },
    }
