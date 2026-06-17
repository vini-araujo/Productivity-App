"""Read-only persistence operations for calendar aggregation."""

from datetime import UTC, date, datetime, time
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.modules.journal.models import JournalEntry
from app.modules.running.models import RunSession
from app.modules.tasks.models import Task
from app.modules.workouts.models import WorkoutSession


class CalendarRepository:
    """Aggregate existing user-owned records for the calendar."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def list_tasks(
        self,
        user_id: UUID,
        start_at: datetime,
        end_at: datetime,
    ) -> list[Task]:
        """Return owned tasks with due dates inside the range."""
        statement = (
            select(Task)
            .where(
                Task.user_id == user_id,
                Task.due_at.is_not(None),
                Task.due_at >= start_at,
                Task.due_at < end_at,
            )
            .order_by(Task.due_at.asc(), Task.id.asc())
        )
        return list(self.session.scalars(statement))

    def list_workouts(
        self,
        user_id: UUID,
        start_at: datetime,
        end_at: datetime,
    ) -> list[WorkoutSession]:
        """Return owned workout sessions started or completed inside the range."""
        statement = (
            select(WorkoutSession)
            .where(
                WorkoutSession.user_id == user_id,
                or_(
                    (WorkoutSession.started_at >= start_at)
                    & (WorkoutSession.started_at < end_at),
                    (WorkoutSession.completed_at >= start_at)
                    & (WorkoutSession.completed_at < end_at),
                ),
            )
            .order_by(WorkoutSession.started_at.asc(), WorkoutSession.id.asc())
        )
        return list(self.session.scalars(statement))

    def list_runs(
        self,
        user_id: UUID,
        start_at: datetime,
        end_at: datetime,
    ) -> list[RunSession]:
        """Return owned run sessions inside the range."""
        statement = (
            select(RunSession)
            .where(
                RunSession.user_id == user_id,
                RunSession.started_at >= start_at,
                RunSession.started_at < end_at,
            )
            .order_by(RunSession.started_at.asc(), RunSession.id.asc())
        )
        return list(self.session.scalars(statement))

    def list_journal_entries(
        self,
        user_id: UUID,
        start_date: date,
        end_date: date,
    ) -> list[JournalEntry]:
        """Return owned journal entries inside the inclusive date range."""
        statement = (
            select(JournalEntry)
            .where(
                JournalEntry.user_id == user_id,
                JournalEntry.entry_date >= start_date,
                JournalEntry.entry_date <= end_date,
            )
            .order_by(JournalEntry.entry_date.asc(), JournalEntry.id.asc())
        )
        return list(self.session.scalars(statement))


def start_of_day(value: date) -> datetime:
    """Convert a date to a UTC start-of-day datetime for range filtering."""
    return datetime.combine(value, time.min, tzinfo=UTC)
