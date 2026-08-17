"""Business logic for calendar aggregation."""

from datetime import date, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser
from app.modules.calendar.repository import CalendarRepository, start_of_day
from app.modules.calendar.schemas import (
    ActivityDay,
    ActivitySummaryResponse,
    CalendarItem,
    CalendarResponse,
)
from app.modules.journal.models import JournalEntry
from app.modules.running.models import RunSession
from app.modules.tasks.models import Task
from app.modules.workouts.models import WorkoutSession

MAX_RANGE_DAYS = 62
MAX_ACTIVITY_RANGE_DAYS = 366
ACTIVITY_KINDS = ("task", "workout", "run", "journal")


class CalendarService:
    """Build a read-only calendar from existing user-owned feature data."""

    def __init__(self, session: Session) -> None:
        self.repository = CalendarRepository(session)

    def get(
        self,
        user: AuthenticatedUser,
        start_date: date,
        end_date: date,
    ) -> CalendarResponse:
        """Return calendar items for a validated inclusive date range."""
        self._validate_range(start_date, end_date)
        start_at = start_of_day(start_date)
        end_at = start_of_day(end_date + timedelta(days=1))

        items = [
            *[
                self._task_item(task)
                for task in self.repository.list_tasks(user.user_id, start_at, end_at)
            ],
            *[
                self._workout_item(workout)
                for workout in self.repository.list_workouts(
                    user.user_id,
                    start_at,
                    end_at,
                )
            ],
            *[
                self._run_item(run)
                for run in self.repository.list_runs(user.user_id, start_at, end_at)
            ],
            *[
                self._journal_item(entry)
                for entry in self.repository.list_journal_entries(
                    user.user_id,
                    start_date,
                    end_date,
                )
            ],
        ]
        items.sort(
            key=lambda item: (
                item.date,
                item.timestamp is not None,
                item.timestamp.isoformat() if item.timestamp else "",
                item.kind,
                item.title.lower(),
            )
        )
        return CalendarResponse(
            start_date=start_date,
            end_date=end_date,
            items=items,
        )

    def get_activity_summary(
        self,
        user: AuthenticatedUser,
        start_date: date,
        end_date: date,
    ) -> ActivitySummaryResponse:
        """Return zero-filled daily activity counts for a validated range."""
        self._validate_range(start_date, end_date, MAX_ACTIVITY_RANGE_DAYS)
        start_at = start_of_day(start_date)
        end_at = start_of_day(end_date + timedelta(days=1))

        counts_by_day = {
            start_date + timedelta(days=offset): {kind: 0 for kind in ACTIVITY_KINDS}
            for offset in range((end_date - start_date).days + 1)
        }

        for task in self.repository.list_completed_tasks(
            user.user_id,
            start_at,
            end_at,
        ):
            assert task.completed_at is not None
            counts_by_day[task.completed_at.date()]["task"] += 1

        for workout in self.repository.list_activity_workouts(
            user.user_id,
            start_at,
            end_at,
        ):
            timestamp = workout.completed_at or workout.started_at
            counts_by_day[timestamp.date()]["workout"] += 1

        for run in self.repository.list_runs(user.user_id, start_at, end_at):
            counts_by_day[run.started_at.date()]["run"] += 1

        for entry in self.repository.list_journal_entries(
            user.user_id,
            start_date,
            end_date,
        ):
            counts_by_day[entry.entry_date]["journal"] += 1

        days = [
            ActivityDay(
                date=day,
                counts=counts,
                total=sum(counts.values()),
            )
            for day, counts in counts_by_day.items()
        ]
        return ActivitySummaryResponse(
            start_date=start_date,
            end_date=end_date,
            days=days,
        )

    @staticmethod
    def _validate_range(
        start_date: date,
        end_date: date,
        max_range_days: int = MAX_RANGE_DAYS,
    ) -> None:
        if end_date < start_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="end_date must be on or after start_date",
            )
        if (end_date - start_date).days + 1 > max_range_days:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"date range cannot exceed {max_range_days} days",
            )

    @staticmethod
    def _task_item(task: Task) -> CalendarItem:
        assert task.due_at is not None
        status_label = "Completed" if task.completed_at else "Open"
        return CalendarItem(
            kind="task",
            source_id=task.id,
            title=task.title,
            date=task.due_at.date(),
            timestamp=task.due_at,
            status=status_label,
            detail=f"{task.priority.title()} priority",
            href="/tasks",
        )

    @staticmethod
    def _workout_item(workout: WorkoutSession) -> CalendarItem:
        timestamp = workout.completed_at or workout.started_at
        return CalendarItem(
            kind="workout",
            source_id=workout.id,
            title=workout.name,
            date=timestamp.date(),
            timestamp=timestamp,
            status="Completed" if workout.completed_at else "Active",
            detail="Workout session",
            href="/gym",
        )

    @staticmethod
    def _run_item(run: RunSession) -> CalendarItem:
        return CalendarItem(
            kind="run",
            source_id=run.id,
            title="Run",
            date=run.started_at.date(),
            timestamp=run.started_at,
            status="Logged",
            detail=CalendarService._run_detail(run.distance_km, run.duration_seconds),
            href="/running",
        )

    @staticmethod
    def _journal_item(entry: JournalEntry) -> CalendarItem:
        return CalendarItem(
            kind="journal",
            source_id=entry.id,
            title=entry.title or "Journal entry",
            date=entry.entry_date,
            timestamp=None,
            status="Written",
            detail="Daily reflection",
            href="/journal",
        )

    @staticmethod
    def _run_detail(distance_km: Decimal, duration_seconds: int) -> str:
        minutes = round(duration_seconds / 60)
        return f"{distance_km:.2f} km in {minutes} min"
