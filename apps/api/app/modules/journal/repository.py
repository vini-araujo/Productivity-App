"""Persistence operations for daily journal entries."""

from datetime import date
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.modules.journal.models import JournalEntry


class JournalRepository:
    """Read and write journal entries while enforcing user ownership."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, entry: JournalEntry) -> None:
        """Stage a journal entry for persistence."""
        self.session.add(entry)

    def get_owned(self, entry_id: UUID, user_id: UUID) -> JournalEntry | None:
        """Return an entry only when it belongs to the authenticated user."""
        return self.session.scalar(
            select(JournalEntry).where(
                JournalEntry.id == entry_id,
                JournalEntry.user_id == user_id,
            )
        )

    def get_owned_by_date(self, user_id: UUID, entry_date: date) -> JournalEntry | None:
        """Return the user's entry for a local calendar date."""
        return self.session.scalar(
            select(JournalEntry).where(
                JournalEntry.user_id == user_id,
                JournalEntry.entry_date == entry_date,
            )
        )

    def list_owned(
        self,
        user_id: UUID,
        *,
        limit: int,
        offset: int,
        search: str | None,
    ) -> list[JournalEntry]:
        """Return a newest-first page of the user's journal history."""
        statement = select(JournalEntry).where(JournalEntry.user_id == user_id)
        statement = self._filter_search(statement, search)
        statement = statement.order_by(
            JournalEntry.entry_date.desc(),
            JournalEntry.id.desc(),
        )
        return list(self.session.scalars(statement.limit(limit).offset(offset)))

    def count_owned(self, user_id: UUID, search: str | None) -> int:
        """Count journal entries under the active search."""
        statement = (
            select(func.count())
            .select_from(JournalEntry)
            .where(JournalEntry.user_id == user_id)
        )
        statement = self._filter_search(statement, search)
        return self.session.scalar(statement) or 0

    def delete(self, entry: JournalEntry) -> None:
        """Stage an owned journal entry for deletion."""
        self.session.delete(entry)

    @staticmethod
    def _filter_search(statement, search: str | None):
        if not search:
            return statement
        pattern = f"%{search}%"
        return statement.where(
            or_(
                JournalEntry.title.ilike(pattern),
                JournalEntry.content.ilike(pattern),
            )
        )
