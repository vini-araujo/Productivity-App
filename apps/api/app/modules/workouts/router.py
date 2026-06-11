"""HTTP routes for workout plans and logged sessions."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import get_session
from app.modules.workouts.schemas import (
    ExerciseCreate,
    ExerciseResponse,
    WorkoutPlanCreate,
    WorkoutPlanResponse,
    WorkoutSessionResponse,
    WorkoutSessionUpdate,
    WorkoutSetResponse,
    WorkoutSetUpdate,
)
from app.modules.workouts.service import WorkoutService

router = APIRouter(prefix="/api/v1/workouts", tags=["workouts"])


def get_workout_service(
    session: Annotated[Session, Depends(get_session)],
) -> WorkoutService:
    return WorkoutService(session)


@router.get("/exercises", response_model=list[ExerciseResponse])
def list_exercises(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[WorkoutService, Depends(get_workout_service)],
) -> list[ExerciseResponse]:
    return service.list_exercises(user)


@router.post(
    "/exercises", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED
)
def create_exercise(
    data: ExerciseCreate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[WorkoutService, Depends(get_workout_service)],
) -> ExerciseResponse:
    return service.create_exercise(user, data)


@router.get("/plans", response_model=list[WorkoutPlanResponse])
def list_plans(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[WorkoutService, Depends(get_workout_service)],
) -> list[WorkoutPlanResponse]:
    return service.list_plans(user)


@router.post(
    "/plans", response_model=WorkoutPlanResponse, status_code=status.HTTP_201_CREATED
)
def create_plan(
    data: WorkoutPlanCreate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[WorkoutService, Depends(get_workout_service)],
) -> WorkoutPlanResponse:
    return service.create_plan(user, data)


@router.put("/plans/{plan_id}", response_model=WorkoutPlanResponse)
def update_plan(
    plan_id: UUID,
    data: WorkoutPlanCreate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[WorkoutService, Depends(get_workout_service)],
) -> WorkoutPlanResponse:
    return service.update_plan(user, plan_id, data)


@router.post(
    "/plans/{plan_id}/clone",
    response_model=WorkoutPlanResponse,
    status_code=status.HTTP_201_CREATED,
)
def clone_plan(
    plan_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[WorkoutService, Depends(get_workout_service)],
) -> WorkoutPlanResponse:
    return service.clone_plan(user, plan_id)


@router.post(
    "/plans/{plan_id}/days/{day_id}/start",
    response_model=WorkoutSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_session(
    plan_id: UUID,
    day_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[WorkoutService, Depends(get_workout_service)],
) -> WorkoutSessionResponse:
    return service.start_session(user, plan_id, day_id)


@router.get("/sessions", response_model=list[WorkoutSessionResponse])
def list_sessions(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[WorkoutService, Depends(get_workout_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[WorkoutSessionResponse]:
    return service.list_sessions(user, limit)


@router.get("/sessions/{session_id}", response_model=WorkoutSessionResponse)
def get_session(
    session_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[WorkoutService, Depends(get_workout_service)],
) -> WorkoutSessionResponse:
    return service.get_session(user, session_id)


@router.patch("/sessions/{session_id}", response_model=WorkoutSessionResponse)
def update_session(
    session_id: UUID,
    data: WorkoutSessionUpdate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[WorkoutService, Depends(get_workout_service)],
) -> WorkoutSessionResponse:
    return service.update_session(user, session_id, data)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[WorkoutService, Depends(get_workout_service)],
) -> Response:
    service.delete_session(user, session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/sets/{set_id}", response_model=WorkoutSetResponse)
def update_set(
    set_id: UUID,
    data: WorkoutSetUpdate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[WorkoutService, Depends(get_workout_service)],
) -> WorkoutSetResponse:
    return service.update_set(user, set_id, data)
