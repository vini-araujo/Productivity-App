"""Tests for authenticated calendar aggregation."""

from collections.abc import Generator
from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import Base
from app.main import app
from app.modules.calendar.router import get_calendar_service
from app.modules.calendar.schemas import (
    ActivitySummaryResponse,
    CalendarResponse,
)
from app.modules.calendar.service import CalendarService
from app.modules.journal.models import JournalEntry
from app.modules.running.models import RunSession
from app.modules.tasks.models import Task
from app.modules.workouts.models import WorkoutSession


@pytest.fixture
def session() -> Generator[Session]:
    """Provide an isolated in-memory calendar database."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as database_session:
        yield database_session


def test_calendar_service_returns_empty_range(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)

    snapshot = CalendarService(session).get(
        user,
        date(2026, 6, 1),
        date(2026, 6, 30),
    )

    assert snapshot.start_date == date(2026, 6, 1)
    assert snapshot.end_date == date(2026, 6, 30)
    assert snapshot.items == []


def test_calendar_service_aggregates_only_owned_data(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    stranger_id = uuid4()
    inside = datetime(2026, 6, 12, 14, 30, tzinfo=UTC)
    outside = datetime(2026, 7, 1, 9, 0, tzinfo=UTC)
    owned_task = Task(
        user_id=user.user_id,
        title="Submit application",
        due_at=inside,
        priority="high",
    )
    completed_workout = WorkoutSession(
        user_id=user.user_id,
        name="Upper",
        started_at=inside - timedelta(hours=1),
        completed_at=inside,
    )
    run = RunSession(
        user_id=user.user_id,
        started_at=inside + timedelta(hours=2),
        distance_km=5,
        duration_seconds=1500,
    )
    journal = JournalEntry(
        user_id=user.user_id,
        entry_date=date(2026, 6, 12),
        title="Good day",
        content="Showed up.",
    )
    session.add_all(
        [
            owned_task,
            completed_workout,
            run,
            journal,
            Task(
                user_id=user.user_id,
                title="Outside range",
                due_at=outside,
                priority="medium",
            ),
            Task(
                user_id=user.user_id,
                title="No due date",
                priority="low",
            ),
            Task(
                user_id=stranger_id,
                title="Stranger task",
                due_at=inside,
                priority="high",
            ),
            WorkoutSession(
                user_id=stranger_id,
                name="Stranger workout",
                started_at=inside,
            ),
            RunSession(
                user_id=stranger_id,
                started_at=inside,
                distance_km=10,
                duration_seconds=3000,
            ),
            JournalEntry(
                user_id=stranger_id,
                entry_date=date(2026, 6, 12),
                title="Stranger journal",
                content="Private.",
            ),
        ]
    )
    session.commit()

    snapshot = CalendarService(session).get(
        user,
        date(2026, 6, 1),
        date(2026, 6, 30),
    )

    titles = [item.title for item in snapshot.items]
    assert titles == ["Good day", "Submit application", "Upper", "Run"]
    assert {item.kind for item in snapshot.items} == {
        "journal",
        "task",
        "workout",
        "run",
    }
    assert all("Stranger" not in item.title for item in snapshot.items)
    assert all(item.date == date(2026, 6, 12) for item in snapshot.items)


@pytest.mark.parametrize(
    ("start_date", "end_date", "detail"),
    [
        (date(2026, 6, 30), date(2026, 6, 1), "end_date must be"),
        (date(2026, 1, 1), date(2026, 3, 31), "date range cannot exceed"),
    ],
)
def test_calendar_service_validates_range(
    session: Session,
    start_date: date,
    end_date: date,
    detail: str,
) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)

    with pytest.raises(HTTPException) as error:
        CalendarService(session).get(user, start_date, end_date)

    assert detail in str(error.value.detail)


def test_activity_summary_returns_zero_filled_range(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)

    summary = CalendarService(session).get_activity_summary(
        user,
        date(2026, 6, 10),
        date(2026, 6, 12),
    )

    assert summary.start_date == date(2026, 6, 10)
    assert summary.end_date == date(2026, 6, 12)
    assert [day.date for day in summary.days] == [
        date(2026, 6, 10),
        date(2026, 6, 11),
        date(2026, 6, 12),
    ]
    assert all(
        day.counts == {"task": 0, "workout": 0, "run": 0, "journal": 0}
        for day in summary.days
    )
    assert all(day.total == 0 for day in summary.days)


def test_activity_summary_aggregates_only_owned_existing_data(
    session: Session,
) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    stranger_id = uuid4()
    inside = datetime(2026, 6, 12, 14, 30, tzinfo=UTC)
    outside = datetime(2026, 7, 1, 9, 0, tzinfo=UTC)

    session.add_all(
        [
            Task(
                user_id=user.user_id,
                title="Completed task",
                completed_at=inside,
                priority="high",
            ),
            Task(
                user_id=user.user_id,
                title="Open due task",
                due_at=inside,
                priority="medium",
            ),
            Task(
                user_id=user.user_id,
                title="Outside completed task",
                completed_at=outside,
                priority="low",
            ),
            Task(
                user_id=stranger_id,
                title="Stranger completed task",
                completed_at=inside,
                priority="high",
            ),
            WorkoutSession(
                user_id=user.user_id,
                name="Completed workout",
                started_at=inside - timedelta(hours=2),
                completed_at=inside - timedelta(hours=1),
            ),
            WorkoutSession(
                user_id=user.user_id,
                name="Active workout",
                started_at=inside + timedelta(hours=1),
            ),
            WorkoutSession(
                user_id=stranger_id,
                name="Stranger workout",
                started_at=inside,
                completed_at=inside,
            ),
            RunSession(
                user_id=user.user_id,
                started_at=inside,
                distance_km=5,
                duration_seconds=1500,
            ),
            RunSession(
                user_id=stranger_id,
                started_at=inside,
                distance_km=10,
                duration_seconds=3000,
            ),
            JournalEntry(
                user_id=user.user_id,
                entry_date=date(2026, 6, 12),
                title="Good day",
                content="Showed up.",
            ),
            JournalEntry(
                user_id=stranger_id,
                entry_date=date(2026, 6, 12),
                title="Stranger journal",
                content="Private.",
            ),
        ]
    )
    session.commit()

    summary = CalendarService(session).get_activity_summary(
        user,
        date(2026, 6, 12),
        date(2026, 6, 12),
    )

    assert len(summary.days) == 1
    assert summary.days[0].counts == {
        "task": 1,
        "workout": 2,
        "run": 1,
        "journal": 1,
    }
    assert summary.days[0].total == 5


@pytest.mark.parametrize(
    ("start_date", "end_date", "detail"),
    [
        (date(2026, 6, 30), date(2026, 6, 1), "end_date must be"),
        (date(2026, 1, 1), date(2027, 1, 2), "date range cannot exceed"),
    ],
)
def test_activity_summary_validates_range(
    session: Session,
    start_date: date,
    end_date: date,
    detail: str,
) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)

    with pytest.raises(HTTPException) as error:
        CalendarService(session).get_activity_summary(user, start_date, end_date)

    assert detail in str(error.value.detail)


class FakeCalendarService:
    """Calendar service test double used at the HTTP boundary."""

    def __init__(self, response: CalendarResponse) -> None:
        self.response = response

    def get(
        self,
        user: AuthenticatedUser,
        start_date: date,
        end_date: date,
    ) -> CalendarResponse:
        assert user.user_id
        assert start_date == self.response.start_date
        assert end_date == self.response.end_date
        return self.response


class FakeActivitySummaryService:
    """Activity summary test double used at the HTTP boundary."""

    def __init__(self, response: ActivitySummaryResponse) -> None:
        self.response = response

    def get_activity_summary(
        self,
        user: AuthenticatedUser,
        start_date: date,
        end_date: date,
    ) -> ActivitySummaryResponse:
        assert user.user_id
        assert start_date == self.response.start_date
        assert end_date == self.response.end_date
        return self.response


@pytest.mark.anyio
async def test_calendar_endpoint_requires_authentication() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/calendar",
            params={"start_date": "2026-06-01", "end_date": "2026-06-30"},
        )

    assert response.status_code == 401


@pytest.mark.anyio
async def test_activity_summary_endpoint_requires_authentication() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/calendar/activity-summary",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"},
        )

    assert response.status_code == 401


@pytest.mark.anyio
async def test_calendar_endpoint_returns_snapshot(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    snapshot = CalendarService(session).get(
        user,
        date(2026, 6, 1),
        date(2026, 6, 30),
    )
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_calendar_service] = lambda: FakeCalendarService(
        snapshot
    )

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            response = await client.get(
                "/api/v1/calendar",
                params={"start_date": "2026-06-01", "end_date": "2026-06-30"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["start_date"] == "2026-06-01"
    assert response.json()["end_date"] == "2026-06-30"
    assert response.json()["items"] == []


@pytest.mark.anyio
async def test_activity_summary_endpoint_returns_snapshot() -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    summary = ActivitySummaryResponse(
        start_date=date(2026, 1, 1),
        end_date=date(2026, 1, 1),
        days=[
            {
                "date": date(2026, 1, 1),
                "counts": {"task": 1, "workout": 0, "run": 0, "journal": 1},
                "total": 2,
            }
        ],
    )
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_calendar_service] = lambda: FakeActivitySummaryService(
        summary
    )

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            response = await client.get(
                "/api/v1/calendar/activity-summary",
                params={"start_date": "2026-01-01", "end_date": "2026-01-01"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "start_date": "2026-01-01",
        "end_date": "2026-01-01",
        "days": [
            {
                "date": "2026-01-01",
                "counts": {"task": 1, "workout": 0, "run": 0, "journal": 1},
                "total": 2,
            }
        ],
    }
