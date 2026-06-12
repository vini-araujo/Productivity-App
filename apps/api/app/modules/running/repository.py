"""Persistence operations for user-owned runs."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.running.models import RunSession


class RunRepository:
    """Read and write runs while enforcing user ownership."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, run: RunSession) -> None:
        self.session.add(run)

    def get_owned(self, run_id: UUID, user_id: UUID) -> RunSession | None:
        return self.session.scalar(
            select(RunSession).where(
                RunSession.id == run_id,
                RunSession.user_id == user_id,
            )
        )

    def list_owned(self, user_id: UUID, limit: int, offset: int) -> list[RunSession]:
        return list(
            self.session.scalars(
                select(RunSession)
                .where(RunSession.user_id == user_id)
                .order_by(RunSession.started_at.desc(), RunSession.id.desc())
                .limit(limit)
                .offset(offset)
            )
        )

    def count_owned(self, user_id: UUID) -> int:
        statement = (
            select(func.count())
            .select_from(RunSession)
            .where(RunSession.user_id == user_id)
        )
        return self.session.scalar(statement) or 0

    def get_latest(self, user_id: UUID) -> RunSession | None:
        return self.session.scalar(
            select(RunSession)
            .where(RunSession.user_id == user_id)
            .order_by(RunSession.started_at.desc(), RunSession.id.desc())
            .limit(1)
        )

    def delete(self, run: RunSession) -> None:
        self.session.delete(run)
