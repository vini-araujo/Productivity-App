"""HTTP routes for user-owned running activity."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import get_session
from app.modules.running.schemas import (
    RunListResponse,
    RunResponse,
    RunUpdate,
    RunWrite,
)
from app.modules.running.service import RunService

router = APIRouter(prefix="/api/v1/runs", tags=["running"])


def get_run_service(session: Annotated[Session, Depends(get_session)]) -> RunService:
    return RunService(session)


@router.post("", response_model=RunResponse, status_code=status.HTTP_201_CREATED)
def create_run(
    data: RunWrite,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[RunService, Depends(get_run_service)],
) -> RunResponse:
    return service.create(user, data)


@router.get("", response_model=RunListResponse)
def list_runs(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[RunService, Depends(get_run_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> RunListResponse:
    return service.list(user, limit, offset)


@router.patch("/{run_id}", response_model=RunResponse)
def update_run(
    run_id: UUID,
    changes: RunUpdate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[RunService, Depends(get_run_service)],
) -> RunResponse:
    return service.update(user, run_id, changes)


@router.delete("/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_run(
    run_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[RunService, Depends(get_run_service)],
) -> Response:
    service.delete(user, run_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
