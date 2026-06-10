"""Persistence operations for tasks."""

from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

from app.modules.tasks.models import Task


class TaskRepository:
    """Read and write tasks while enforcing user ownership."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, task: Task) -> None:
        """Stage a new task for persistence."""
        self.session.add(task)

    def get_owned(self, task_id: UUID, user_id: UUID) -> Task | None:
        """Return a task only when it belongs to the authenticated user."""
        return self.session.scalar(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )

    def list_owned(
        self,
        user_id: UUID,
        *,
        limit: int,
        offset: int,
        completed: bool | None,
    ) -> list[Task]:
        """Return an ordered page of tasks owned by a user."""
        statement = select(Task).where(Task.user_id == user_id)
        statement = self._filter_completed(statement, completed)
        statement = statement.order_by(
            Task.completed_at.is_not(None).asc(),
            Task.created_at.desc(),
            Task.id.desc(),
        )
        return list(self.session.scalars(statement.limit(limit).offset(offset)))

    def count_owned(self, user_id: UUID, completed: bool | None) -> int:
        """Count tasks owned by a user under the active completion filter."""
        statement = (
            select(func.count()).select_from(Task).where(Task.user_id == user_id)
        )
        statement = self._filter_completed(statement, completed)
        return self.session.scalar(statement) or 0

    def delete(self, task: Task) -> None:
        """Stage an owned task for deletion."""
        self.session.delete(task)

    @staticmethod
    def _filter_completed(
        statement: Select[Any],
        completed: bool | None,
    ) -> Select[Any]:
        if completed is True:
            return statement.where(Task.completed_at.is_not(None))
        if completed is False:
            return statement.where(Task.completed_at.is_(None))
        return statement
