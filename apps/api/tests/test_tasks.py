"""Tests for user-owned task behavior."""

from collections.abc import Generator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import httpx
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import Base
from app.main import app
from app.modules.tasks.models import Task
from app.modules.tasks.router import get_task_service
from app.modules.tasks.schemas import (
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
)
from app.modules.tasks.service import TaskService


@pytest.fixture
def session() -> Generator[Session]:
    """Provide an isolated in-memory task database."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as database_session:
        yield database_session


def test_task_service_crud_and_completion(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    service = TaskService(session)

    created = service.create(
        user,
        TaskCreate(
            title="  Finish Milestone 3  ",
            description="  Implement tasks CRUD.  ",
            priority="high",
        ),
    )
    listed = service.list(user, limit=20, offset=0, completed=None)
    completed = service.update(user, created.id, TaskUpdate(completed=True))
    reopened = service.update(user, created.id, TaskUpdate(completed=False))
    service.delete(user, created.id)

    assert created.title == "Finish Milestone 3"
    assert created.description == "Implement tasks CRUD."
    assert listed.total == 1
    assert listed.items[0].id == created.id
    assert completed.completed_at is not None
    assert reopened.completed_at is None
    assert service.list(user, limit=20, offset=0, completed=None).total == 0


def test_task_service_scopes_every_operation_by_user(session: Session) -> None:
    owner = AuthenticatedUser(user_id=uuid4(), email=None)
    stranger = AuthenticatedUser(user_id=uuid4(), email=None)
    service = TaskService(session)
    task = service.create(owner, TaskCreate(title="Owner only"))

    assert service.list(stranger, limit=20, offset=0, completed=None).total == 0

    for action in (
        lambda: service.get(stranger, task.id),
        lambda: service.update(stranger, task.id, TaskUpdate(title="Stolen")),
        lambda: service.delete(stranger, task.id),
    ):
        with pytest.raises(HTTPException) as error:
            action()
        assert error.value.status_code == 404


def test_task_service_filters_and_paginates(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    service = TaskService(session)
    first = service.create(user, TaskCreate(title="First"))
    service.create(user, TaskCreate(title="Second"))
    service.update(user, first.id, TaskUpdate(completed=True))

    open_tasks = service.list(user, limit=1, offset=0, completed=False)
    completed_tasks = service.list(user, limit=1, offset=0, completed=True)

    assert open_tasks.total == 1
    assert open_tasks.items[0].title == "Second"
    assert completed_tasks.total == 1
    assert completed_tasks.items[0].title == "First"


def test_task_pagination_uses_id_as_a_stable_tie_breaker(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    service = TaskService(session)
    task_ids = [
        service.create(user, TaskCreate(title=f"Task {index}")).id for index in range(5)
    ]
    shared_created_at = datetime.now(UTC)
    for task_id in task_ids:
        task = session.get(Task, task_id)
        assert task is not None
        task.created_at = shared_created_at
    session.commit()

    first_page = service.list(user, limit=2, offset=0, completed=None)
    second_page = service.list(user, limit=2, offset=2, completed=None)

    expected = sorted(task_ids, reverse=True)
    assert [task.id for task in first_page.items] == expected[:2]
    assert [task.id for task in second_page.items] == expected[2:4]


@pytest.mark.parametrize(
    ("schema", "data"),
    [
        (TaskCreate, {"title": "   "}),
        (TaskCreate, {"title": "Task", "priority": "urgent"}),
        (TaskCreate, {"title": "Task", "due_at": "2026-06-10T12:00:00"}),
        (TaskUpdate, {"title": None}),
        (TaskUpdate, {"due_at": "2026-06-10T12:00:00"}),
        (TaskUpdate, {"priority": None}),
        (TaskUpdate, {"completed": None}),
    ],
)
def test_task_schemas_reject_invalid_changes(
    schema: type[TaskCreate] | type[TaskUpdate],
    data: dict[str, object],
) -> None:
    with pytest.raises(ValidationError):
        schema.model_validate(data)


class FakeTaskService:
    """Task service test double used at the HTTP boundary."""

    def __init__(self, task: TaskResponse) -> None:
        self.task = task
        self.deleted_task_id: UUID | None = None

    def create(self, user: AuthenticatedUser, data: TaskCreate) -> TaskResponse:
        assert user.user_id
        return self.task.model_copy(update=data.model_dump())

    def list(
        self,
        user: AuthenticatedUser,
        *,
        limit: int,
        offset: int,
        completed: bool | None,
    ) -> TaskListResponse:
        assert user.user_id
        assert completed is None
        return TaskListResponse(items=[self.task], total=1, limit=limit, offset=offset)

    def get(self, user: AuthenticatedUser, task_id: UUID) -> TaskResponse:
        assert user.user_id and task_id == self.task.id
        return self.task

    def update(
        self,
        user: AuthenticatedUser,
        task_id: UUID,
        changes: TaskUpdate,
    ) -> TaskResponse:
        assert user.user_id and task_id == self.task.id
        values = changes.model_dump(exclude_unset=True)
        values.pop("completed", None)
        return self.task.model_copy(update=values)

    def delete(self, user: AuthenticatedUser, task_id: UUID) -> None:
        assert user.user_id
        self.deleted_task_id = task_id


@pytest.mark.anyio
async def test_task_endpoints_require_authentication() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/tasks")

    assert response.status_code == 401


@pytest.mark.anyio
async def test_task_endpoints_support_crud() -> None:
    user_id = uuid4()
    task_id = uuid4()
    now = datetime.now(UTC)
    task = TaskResponse(
        id=task_id,
        title="Task",
        description=None,
        due_at=None,
        priority="medium",
        completed_at=None,
        created_at=now,
        updated_at=now,
    )
    service = FakeTaskService(task)
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        user_id=user_id,
        email=None,
    )
    app.dependency_overrides[get_task_service] = lambda: service

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            create_response = await client.post(
                "/api/v1/tasks",
                json={"title": "Created"},
            )
            list_response = await client.get("/api/v1/tasks")
            get_response = await client.get(f"/api/v1/tasks/{task_id}")
            patch_response = await client.patch(
                f"/api/v1/tasks/{task_id}",
                json={"title": "Updated"},
            )
            delete_response = await client.delete(f"/api/v1/tasks/{task_id}")
    finally:
        app.dependency_overrides.clear()

    assert create_response.status_code == 201
    assert create_response.json()["title"] == "Created"
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert get_response.status_code == 200
    assert patch_response.json()["title"] == "Updated"
    assert delete_response.status_code == 204
    assert service.deleted_task_id == task_id
