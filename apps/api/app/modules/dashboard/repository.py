"""Read-only persistence operations for dashboard aggregation."""

from datetime import date
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.modules.journal.models import JournalEntry
from app.modules.tasks.models import Task
from app.modules.workouts.models import WorkoutSession


class DashboardRepository:
    """Aggregate existing user-owned feature data for the dashboard."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def count_open_tasks(self, user_id: UUID) -> int:
        """Count open tasks owned by a user."""
        statement = (
            select(func.count())
            .select_from(Task)
            .where(Task.user_id == user_id, Task.completed_at.is_(None))
        )
        return self.session.scalar(statement) or 0

    def list_next_tasks(self, user_id: UUID, limit: int) -> list[Task]:
        """Return the user's most actionable open tasks."""
        priority_order = case(
            (Task.priority == "high", 0),
            (Task.priority == "medium", 1),
            else_=2,
        )
        statement = (
            select(Task)
            .where(Task.user_id == user_id, Task.completed_at.is_(None))
            .order_by(
                Task.due_at.is_(None),
                Task.due_at.asc(),
                priority_order,
                Task.created_at.desc(),
                Task.id.desc(),
            )
            .limit(limit)
        )
        return list(self.session.scalars(statement))

    def get_active_workout(self, user_id: UUID) -> WorkoutSession | None:
        """Return the user's active workout session, if any."""
        return self.session.scalar(
            select(WorkoutSession).where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.completed_at.is_(None),
            )
        )

    def get_latest_completed_workout(self, user_id: UUID) -> WorkoutSession | None:
        """Return the user's most recently completed workout."""
        return self.session.scalar(
            select(WorkoutSession)
            .where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.completed_at.is_not(None),
            )
            .order_by(
                WorkoutSession.completed_at.desc(),
                WorkoutSession.id.desc(),
            )
            .limit(1)
        )

    def get_journal_entry(
        self,
        user_id: UUID,
        entry_date: date,
    ) -> JournalEntry | None:
        """Return the user's journal entry for a local calendar date."""
        return self.session.scalar(
            select(JournalEntry).where(
                JournalEntry.user_id == user_id,
                JournalEntry.entry_date == entry_date,
            )
        )
