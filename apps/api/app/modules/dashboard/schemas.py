"""API schemas for the dashboard snapshot."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

TaskPriority = Literal["low", "medium", "high"]


class DashboardTask(BaseModel):
    """A concise open task shown on the dashboard."""

    id: UUID
    title: str
    due_at: datetime | None
    priority: TaskPriority


class DashboardTasks(BaseModel):
    """Task summary for the authenticated user."""

    open_count: int
    next_tasks: list[DashboardTask]


class DashboardWorkout(BaseModel):
    """Concise workout session status."""

    id: UUID
    name: str
    started_at: datetime
    completed_at: datetime | None


class DashboardWorkouts(BaseModel):
    """Current and latest workout status."""

    active: DashboardWorkout | None
    latest_completed: DashboardWorkout | None


class DashboardJournal(BaseModel):
    """Journal status for the supplied local calendar date."""

    entry_id: UUID | None
    entry_date: date
    title: str | None
    updated_at: datetime | None


class DashboardResponse(BaseModel):
    """Aggregated dashboard snapshot for one authenticated user."""

    tasks: DashboardTasks
    workouts: DashboardWorkouts
    journal: DashboardJournal
