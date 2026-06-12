"""Tests for the authenticated dashboard snapshot."""

from collections.abc import Generator
from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import Base
from app.main import app
from app.modules.dashboard.router import get_dashboard_service
from app.modules.dashboard.schemas import DashboardResponse
from app.modules.dashboard.service import DashboardService
from app.modules.journal.models import JournalEntry
from app.modules.tasks.models import Task
from app.modules.workouts.models import WorkoutSession


@pytest.fixture
def session() -> Generator[Session]:
    """Provide an isolated in-memory dashboard database."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as database_session:
        yield database_session


def test_dashboard_service_returns_empty_snapshot(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)

    snapshot = DashboardService(session).get(user, date(2026, 6, 12))

    assert snapshot.tasks.open_count == 0
    assert snapshot.tasks.next_tasks == []
    assert snapshot.workouts.active is None
    assert snapshot.workouts.latest_completed is None
    assert snapshot.journal.entry_id is None


def test_dashboard_service_aggregates_only_owned_data(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    stranger_id = uuid4()
    now = datetime.now(UTC)
    next_task = Task(
        user_id=user.user_id,
        title="Next owned task",
        priority="high",
        due_at=now + timedelta(hours=1),
    )
    session.add_all(
        [
            next_task,
            Task(user_id=user.user_id, title="Later owned task", priority="low"),
            Task(
                user_id=user.user_id,
                title="Completed task",
                priority="medium",
                completed_at=now,
            ),
            Task(user_id=stranger_id, title="Stranger task", priority="high"),
            WorkoutSession(
                user_id=user.user_id,
                name="Upper",
                started_at=now,
            ),
            WorkoutSession(
                user_id=user.user_id,
                name="Lower",
                started_at=now - timedelta(days=2),
                completed_at=now - timedelta(days=2),
            ),
            WorkoutSession(
                user_id=stranger_id,
                name="Stranger workout",
                started_at=now,
            ),
            JournalEntry(
                user_id=user.user_id,
                entry_date=date(2026, 6, 12),
                title="Owned reflection",
                content="Private.",
            ),
            JournalEntry(
                user_id=stranger_id,
                entry_date=date(2026, 6, 12),
                title="Stranger reflection",
                content="Private.",
            ),
        ]
    )
    session.commit()

    snapshot = DashboardService(session).get(user, date(2026, 6, 12))

    assert snapshot.tasks.open_count == 2
    assert snapshot.tasks.next_tasks[0].id == next_task.id
    assert all(task.title != "Stranger task" for task in snapshot.tasks.next_tasks)
    assert snapshot.workouts.active is not None
    assert snapshot.workouts.active.name == "Upper"
    assert snapshot.workouts.latest_completed is not None
    assert snapshot.workouts.latest_completed.name == "Lower"
    assert snapshot.journal.title == "Owned reflection"


class FakeDashboardService:
    """Dashboard service test double used at the HTTP boundary."""

    def __init__(self, response: DashboardResponse) -> None:
        self.response = response

    def get(self, user: AuthenticatedUser, local_date: date) -> DashboardResponse:
        assert user.user_id
        assert local_date == self.response.journal.entry_date
        return self.response


@pytest.mark.anyio
async def test_dashboard_endpoint_requires_authentication() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/dashboard",
            params={"local_date": "2026-06-12"},
        )

    assert response.status_code == 401


@pytest.mark.anyio
async def test_dashboard_endpoint_returns_snapshot(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    snapshot = DashboardService(session).get(user, date(2026, 6, 12))
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_dashboard_service] = lambda: FakeDashboardService(
        snapshot
    )

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            response = await client.get(
                "/api/v1/dashboard",
                params={"local_date": "2026-06-12"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["tasks"]["open_count"] == 0
    assert response.json()["journal"]["entry_date"] == "2026-06-12"
