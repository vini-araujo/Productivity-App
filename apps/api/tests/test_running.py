"""Tests for user-owned running activity."""

from collections.abc import Generator
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

import httpx
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import Base
from app.main import app
from app.modules.running.router import get_run_service
from app.modules.running.schemas import (
    RunListResponse,
    RunResponse,
    RunUpdate,
    RunWrite,
)
from app.modules.running.service import RunService


@pytest.fixture
def session() -> Generator[Session]:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as database_session:
        yield database_session


def run_data(**changes: object) -> RunWrite:
    values = {
        "started_at": datetime.now(UTC),
        "distance_km": Decimal("5.00"),
        "duration_seconds": 1500,
        "notes": "Easy run",
    }
    values.update(changes)
    return RunWrite.model_validate(values)


def test_run_service_crud_and_pagination(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    service = RunService(session)

    created = service.create(user, run_data(notes="  Easy run  "))
    listed = service.list(user, limit=20, offset=0)
    updated = service.update(
        user,
        created.id,
        RunUpdate(distance_km=Decimal("5.50"), duration_seconds=1600),
    )
    service.delete(user, created.id)

    assert created.notes == "Easy run"
    assert listed.total == 1
    assert updated.distance_km == Decimal("5.50")
    assert service.list(user, limit=20, offset=0).total == 0


def test_run_service_scopes_every_operation_by_user(session: Session) -> None:
    owner = AuthenticatedUser(user_id=uuid4(), email=None)
    stranger = AuthenticatedUser(user_id=uuid4(), email=None)
    service = RunService(session)
    run = service.create(owner, run_data())

    assert service.list(stranger, limit=20, offset=0).total == 0
    for action in (
        lambda: service.update(stranger, run.id, RunUpdate(notes="Stolen")),
        lambda: service.delete(stranger, run.id),
    ):
        with pytest.raises(HTTPException) as error:
            action()
        assert error.value.status_code == 404


@pytest.mark.parametrize(
    "data",
    [
        {"started_at": "2026-06-12T12:00:00", "distance_km": 5, "duration_seconds": 1},
        {"started_at": "2026-06-12T12:00:00Z", "distance_km": 0, "duration_seconds": 1},
        {"started_at": "2026-06-12T12:00:00Z", "distance_km": 5, "duration_seconds": 0},
    ],
)
def test_run_schema_rejects_invalid_values(data: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        RunWrite.model_validate(data)


class FakeRunService:
    def __init__(self, run: RunResponse) -> None:
        self.run = run
        self.deleted_id: UUID | None = None

    def create(self, user: AuthenticatedUser, data: RunWrite) -> RunResponse:
        assert user.user_id
        return self.run.model_copy(update=data.model_dump())

    def list(self, user: AuthenticatedUser, limit: int, offset: int) -> RunListResponse:
        assert user.user_id
        return RunListResponse(items=[self.run], total=1, limit=limit, offset=offset)

    def update(
        self,
        user: AuthenticatedUser,
        run_id: UUID,
        changes: RunUpdate,
    ) -> RunResponse:
        assert user.user_id and run_id == self.run.id
        return self.run.model_copy(update=changes.model_dump(exclude_unset=True))

    def delete(self, user: AuthenticatedUser, run_id: UUID) -> None:
        assert user.user_id
        self.deleted_id = run_id


@pytest.mark.anyio
async def test_run_endpoints_require_authentication() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/runs")
    assert response.status_code == 401


@pytest.mark.anyio
async def test_run_endpoints_support_crud() -> None:
    now = datetime.now(UTC)
    run_id = uuid4()
    run = RunResponse(
        id=run_id,
        started_at=now,
        distance_km=Decimal("5.00"),
        duration_seconds=1500,
        notes=None,
        created_at=now,
        updated_at=now,
    )
    service = FakeRunService(run)
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        user_id=uuid4(), email=None
    )
    app.dependency_overrides[get_run_service] = lambda: service
    body = {
        "started_at": now.isoformat(),
        "distance_km": 5,
        "duration_seconds": 1500,
    }

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            create_response = await client.post("/api/v1/runs", json=body)
            list_response = await client.get("/api/v1/runs")
            patch_response = await client.patch(
                f"/api/v1/runs/{run_id}", json={"notes": "Comfortable"}
            )
            delete_response = await client.delete(f"/api/v1/runs/{run_id}")
    finally:
        app.dependency_overrides.clear()

    assert create_response.status_code == 201
    assert list_response.json()["total"] == 1
    assert patch_response.json()["notes"] == "Comfortable"
    assert delete_response.status_code == 204
    assert service.deleted_id == run_id
