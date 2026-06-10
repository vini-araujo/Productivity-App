"""Business logic for tasks."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser
from app.modules.tasks.models import Task
from app.modules.tasks.repository import TaskRepository
from app.modules.tasks.schemas import (
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
)


class TaskService:
    """Manage tasks owned by the authenticated user."""

    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = TaskRepository(session)

    def create(self, user: AuthenticatedUser, data: TaskCreate) -> TaskResponse:
        """Create a task owned by the authenticated user."""
        task = Task(user_id=user.user_id, **data.model_dump())
        self.repository.add(task)
        self._commit(task)
        return TaskResponse.model_validate(task)

    def list(
        self,
        user: AuthenticatedUser,
        *,
        limit: int,
        offset: int,
        completed: bool | None,
    ) -> TaskListResponse:
        """Return a paginated list of the authenticated user's tasks."""
        tasks = self.repository.list_owned(
            user.user_id,
            limit=limit,
            offset=offset,
            completed=completed,
        )
        return TaskListResponse(
            items=[TaskResponse.model_validate(task) for task in tasks],
            total=self.repository.count_owned(user.user_id, completed),
            limit=limit,
            offset=offset,
        )

    def get(self, user: AuthenticatedUser, task_id: UUID) -> TaskResponse:
        """Return an owned task or conceal it with a not-found response."""
        return TaskResponse.model_validate(self._get_owned(user, task_id))

    def update(
        self,
        user: AuthenticatedUser,
        task_id: UUID,
        changes: TaskUpdate,
    ) -> TaskResponse:
        """Update allowed fields on an owned task."""
        task = self._get_owned(user, task_id)
        values = changes.model_dump(exclude_unset=True)
        completed = values.pop("completed", None)

        for field, value in values.items():
            setattr(task, field, value)

        if completed is True and task.completed_at is None:
            task.completed_at = datetime.now(UTC)
        elif completed is False:
            task.completed_at = None

        self._commit(task)
        return TaskResponse.model_validate(task)

    def delete(self, user: AuthenticatedUser, task_id: UUID) -> None:
        """Delete an owned task."""
        task = self._get_owned(user, task_id)
        self.repository.delete(task)
        self.session.commit()

    def _get_owned(self, user: AuthenticatedUser, task_id: UUID) -> Task:
        task = self.repository.get_owned(task_id, user.user_id)
        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found",
            )
        return task

    def _commit(self, task: Task) -> None:
        self.session.commit()
        self.session.refresh(task)
