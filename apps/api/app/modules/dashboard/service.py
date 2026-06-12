"""Business logic for dashboard aggregation."""

from datetime import date

from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser
from app.modules.dashboard.repository import DashboardRepository
from app.modules.dashboard.schemas import (
    DashboardJournal,
    DashboardResponse,
    DashboardRun,
    DashboardTask,
    DashboardTasks,
    DashboardWorkout,
    DashboardWorkouts,
)
from app.modules.running.models import RunSession
from app.modules.workouts.models import WorkoutSession


class DashboardService:
    """Build a concise dashboard snapshot for the authenticated user."""

    def __init__(self, session: Session) -> None:
        self.repository = DashboardRepository(session)

    def get(self, user: AuthenticatedUser, local_date: date) -> DashboardResponse:
        """Return existing feature status without creating new data."""
        journal_entry = self.repository.get_journal_entry(user.user_id, local_date)
        return DashboardResponse(
            tasks=DashboardTasks(
                open_count=self.repository.count_open_tasks(user.user_id),
                next_tasks=[
                    DashboardTask(
                        id=task.id,
                        title=task.title,
                        due_at=task.due_at,
                        priority=task.priority,
                    )
                    for task in self.repository.list_next_tasks(user.user_id, limit=5)
                ],
            ),
            workouts=DashboardWorkouts(
                active=self._workout_response(
                    self.repository.get_active_workout(user.user_id)
                ),
                latest_completed=self._workout_response(
                    self.repository.get_latest_completed_workout(user.user_id)
                ),
            ),
            journal=DashboardJournal(
                entry_id=journal_entry.id if journal_entry else None,
                entry_date=local_date,
                title=journal_entry.title if journal_entry else None,
                updated_at=journal_entry.updated_at if journal_entry else None,
            ),
            latest_run=self._run_response(self.repository.get_latest_run(user.user_id)),
        )

    @staticmethod
    def _workout_response(session: WorkoutSession | None) -> DashboardWorkout | None:
        if session is None:
            return None
        return DashboardWorkout(
            id=session.id,
            name=session.name,
            started_at=session.started_at,
            completed_at=session.completed_at,
        )

    @staticmethod
    def _run_response(session: RunSession | None) -> DashboardRun | None:
        if session is None:
            return None
        return DashboardRun(
            id=session.id,
            started_at=session.started_at,
            distance_km=session.distance_km,
            duration_seconds=session.duration_seconds,
        )
