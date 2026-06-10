"""HTTP routes for user-owned tasks."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import get_session
from app.modules.tasks.schemas import (
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
)
from app.modules.tasks.service import TaskService

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


def get_task_service(session: Annotated[Session, Depends(get_session)]) -> TaskService:
    """Build a task service for the current request."""
    return TaskService(session)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[TaskService, Depends(get_task_service)],
) -> TaskResponse:
    """Create a task for the authenticated user."""
    return service.create(user, data)


@router.get("", response_model=TaskListResponse)
def list_tasks(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[TaskService, Depends(get_task_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    completed: bool | None = None,
) -> TaskListResponse:
    """List tasks owned by the authenticated user."""
    return service.list(user, limit=limit, offset=offset, completed=completed)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[TaskService, Depends(get_task_service)],
) -> TaskResponse:
    """Return one owned task."""
    return service.get(user, task_id)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: UUID,
    changes: TaskUpdate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[TaskService, Depends(get_task_service)],
) -> TaskResponse:
    """Update one owned task."""
    return service.update(user, task_id, changes)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[TaskService, Depends(get_task_service)],
) -> Response:
    """Delete one owned task."""
    service.delete(user, task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
