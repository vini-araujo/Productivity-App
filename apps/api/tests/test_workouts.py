"""Tests for plan-first workout tracking."""

from collections.abc import Generator
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser
from app.core.database import Base
from app.main import app
from app.modules.workouts.models import Exercise
from app.modules.workouts.schemas import (
    ExerciseCreate,
    PlanDayInput,
    WorkoutPlanCreate,
    WorkoutSessionUpdate,
    WorkoutSetUpdate,
)
from app.modules.workouts.service import WorkoutService


@pytest.fixture
def session() -> Generator[Session]:
    """Provide an isolated in-memory workout database."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as database_session:
        yield database_session


def test_workout_plan_session_and_set_flow(
    session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    service = WorkoutService(session)
    shared_exercise = Exercise(
        user_id=None,
        name="Incline Bench Press",
        muscle_group="Chest",
    )
    session.add(shared_exercise)
    session.commit()

    custom_exercise = service.create_exercise(
        user,
        ExerciseCreate(name="  Cable Curl  ", muscle_group="Biceps"),
    )
    visible_exercises = service.list_exercises(user)
    plan = service.create_plan(
        user,
        WorkoutPlanCreate(
            name="Upper / Rest",
            description="Two-day rotation",
            days=[
                {
                    "name": "Upper",
                    "exercises": [
                        {
                            "exercise_id": shared_exercise.id,
                            "target_sets": 2,
                            "target_to_failure": True,
                        },
                        {
                            "exercise_id": custom_exercise.id,
                            "target_sets": 1,
                        },
                    ],
                },
                {"name": "Rest", "is_rest_day": True},
            ],
        ),
    )
    cloned = service.clone_plan(user, plan.id)
    updated = service.update_plan(
        user,
        cloned.id,
        WorkoutPlanCreate(
            name="Updated Copy",
            days=[
                {
                    "name": "Upper Updated",
                    "exercises": [{"exercise_id": shared_exercise.id}],
                }
            ],
        ),
    )
    started = service.start_session(user, plan.id, plan.days[0].id)

    assert custom_exercise.name == "Cable Curl"
    assert {exercise.name for exercise in visible_exercises} == {
        "Cable Curl",
        "Incline Bench Press",
    }
    assert updated.name == "Updated Copy"
    assert updated.days[0].name == "Upper Updated"
    assert len(started.sets) == 3
    assert started.sets[0].target_to_failure is True
    assert started.sets[0].reached_failure is False

    updated_set = service.update_set(
        user,
        started.sets[0].id,
        WorkoutSetUpdate(weight="82.5", repetitions=8, reached_failure=True),
    )
    completed = service.update_session(
        user,
        started.id,
        WorkoutSessionUpdate(notes="Strong session", completed=True),
    )

    assert updated_set.weight == 82.5
    assert updated_set.repetitions == 8
    assert completed.completed_at is not None
    assert completed.notes == "Strong session"
    assert service.get_session(user, started.id).id == started.id
    assert service.list_sessions(user, limit=20)[0].id == started.id

    second = service.start_session(user, plan.id, plan.days[0].id)
    with pytest.raises(HTTPException) as reopen_error:
        service.update_session(
            user,
            started.id,
            WorkoutSessionUpdate(completed=False),
        )
    assert reopen_error.value.status_code == 409
    service.update_session(user, second.id, WorkoutSessionUpdate(completed=True))

    def raise_active_session_conflict(_: object) -> None:
        raise IntegrityError("update", {}, RuntimeError("active session conflict"))

    monkeypatch.setattr(service, "_commit", raise_active_session_conflict)
    with pytest.raises(HTTPException) as concurrent_reopen_error:
        service.update_session(user, started.id, WorkoutSessionUpdate(completed=False))
    assert concurrent_reopen_error.value.status_code == 409


def test_workout_service_enforces_visibility_ownership_and_active_limit(
    session: Session,
) -> None:
    owner = AuthenticatedUser(user_id=uuid4(), email=None)
    stranger = AuthenticatedUser(user_id=uuid4(), email=None)
    service = WorkoutService(session)
    exercise = service.create_exercise(owner, ExerciseCreate(name="Owner Exercise"))
    plan = service.create_plan(
        owner,
        WorkoutPlanCreate(
            name="Owner Plan",
            days=[
                {
                    "name": "Training",
                    "exercises": [{"exercise_id": exercise.id}],
                }
            ],
        ),
    )
    started = service.start_session(owner, plan.id, plan.days[0].id)

    with pytest.raises(HTTPException) as active_error:
        service.start_session(owner, plan.id, plan.days[0].id)
    assert active_error.value.status_code == 409

    for action in (
        lambda: service.clone_plan(stranger, plan.id),
        lambda: service.update_plan(
            stranger,
            plan.id,
            WorkoutPlanCreate(
                name="Stolen",
                days=[
                    {
                        "name": "Training",
                        "exercises": [{"exercise_id": exercise.id}],
                    }
                ],
            ),
        ),
        lambda: service.get_session(stranger, started.id),
        lambda: service.delete_session(stranger, started.id),
        lambda: service.update_set(
            stranger,
            started.sets[0].id,
            WorkoutSetUpdate(repetitions=10),
        ),
    ):
        with pytest.raises(HTTPException) as error:
            action()
        assert error.value.status_code == 404

    with pytest.raises(HTTPException) as invisible_exercise:
        service.create_plan(
            stranger,
            WorkoutPlanCreate(
                name="Invalid",
                days=[
                    {
                        "name": "Training",
                        "exercises": [{"exercise_id": exercise.id}],
                    }
                ],
            ),
        )
    assert invisible_exercise.value.status_code == 404

    service.delete_session(owner, started.id)
    assert service.list_sessions(owner, limit=20) == []


def test_rest_days_cannot_start(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    service = WorkoutService(session)
    exercise = Exercise(user_id=None, name="Squat")
    session.add(exercise)
    session.commit()
    plan = service.create_plan(
        user,
        WorkoutPlanCreate(
            name="Training / Rest",
            days=[
                {"name": "Training", "exercises": [{"exercise_id": exercise.id}]},
                {"name": "Rest", "is_rest_day": True},
            ],
        ),
    )

    with pytest.raises(HTTPException) as error:
        service.start_session(user, plan.id, plan.days[1].id)
    assert error.value.status_code == 409


@pytest.mark.parametrize(
    ("schema", "data"),
    [
        (ExerciseCreate, {"name": "   "}),
        (PlanDayInput, {"name": "Rest", "is_rest_day": True, "exercises": [{}]}),
        (PlanDayInput, {"name": "Training", "exercises": []}),
        (
            PlanDayInput,
            {
                "name": "Training",
                "exercises": [
                    {"exercise_id": "00000000-0000-0000-0000-000000000001"},
                    {"exercise_id": "00000000-0000-0000-0000-000000000001"},
                ],
            },
        ),
        (WorkoutSessionUpdate, {"completed": None}),
        (WorkoutSetUpdate, {"reached_failure": None}),
        (WorkoutSetUpdate, {"weight": -1}),
        (WorkoutSetUpdate, {"repetitions": -1}),
    ],
)
def test_workout_schemas_reject_invalid_values(
    schema: type[ExerciseCreate]
    | type[PlanDayInput]
    | type[WorkoutSessionUpdate]
    | type[WorkoutSetUpdate],
    data: dict[str, object],
) -> None:
    with pytest.raises(ValidationError):
        schema.model_validate(data)


@pytest.mark.anyio
async def test_workout_endpoints_require_authentication() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        responses = [
            await client.get("/api/v1/workouts/exercises"),
            await client.get("/api/v1/workouts/plans"),
            await client.get("/api/v1/workouts/sessions"),
            await client.delete(f"/api/v1/workouts/sessions/{uuid4()}"),
        ]

    assert [response.status_code for response in responses] == [401, 401, 401, 401]
