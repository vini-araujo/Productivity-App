"""Business logic for running activity."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser
from app.modules.running.models import RunSession
from app.modules.running.repository import RunRepository
from app.modules.running.schemas import (
    RunListResponse,
    RunResponse,
    RunUpdate,
    RunWrite,
)


class RunService:
    """Manage running history owned by the authenticated user."""

    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = RunRepository(session)

    def create(self, user: AuthenticatedUser, data: RunWrite) -> RunResponse:
        run = RunSession(user_id=user.user_id, **data.model_dump())
        self.repository.add(run)
        return self._commit(run)

    def list(self, user: AuthenticatedUser, limit: int, offset: int) -> RunListResponse:
        return RunListResponse(
            items=[
                RunResponse.model_validate(run)
                for run in self.repository.list_owned(user.user_id, limit, offset)
            ],
            total=self.repository.count_owned(user.user_id),
            limit=limit,
            offset=offset,
        )

    def update(
        self,
        user: AuthenticatedUser,
        run_id: UUID,
        changes: RunUpdate,
    ) -> RunResponse:
        run = self._get_owned(user, run_id)
        for field, value in changes.model_dump(exclude_unset=True).items():
            setattr(run, field, value)
        return self._commit(run)

    def delete(self, user: AuthenticatedUser, run_id: UUID) -> None:
        run = self._get_owned(user, run_id)
        self.repository.delete(run)
        self.session.commit()

    def _get_owned(self, user: AuthenticatedUser, run_id: UUID) -> RunSession:
        run = self.repository.get_owned(run_id, user.user_id)
        if run is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Run not found"
            )
        return run

    def _commit(self, run: RunSession) -> RunResponse:
        self.session.commit()
        self.session.refresh(run)
        return RunResponse.model_validate(run)
