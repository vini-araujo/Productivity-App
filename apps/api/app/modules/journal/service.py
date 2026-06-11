"""Business logic for daily journal entries."""

from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser
from app.modules.journal.models import JournalEntry
from app.modules.journal.repository import JournalRepository
from app.modules.journal.schemas import (
    JournalEntryListResponse,
    JournalEntryResponse,
    JournalEntryUpdate,
    JournalEntryWrite,
)


class JournalService:
    """Manage daily journal entries owned by the authenticated user."""

    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = JournalRepository(session)

    def get_today(
        self,
        user: AuthenticatedUser,
        entry_date: date,
    ) -> JournalEntryResponse | None:
        """Return the user's entry for their supplied local date."""
        entry = self.repository.get_owned_by_date(user.user_id, entry_date)
        return JournalEntryResponse.model_validate(entry) if entry else None

    def save_today(
        self,
        user: AuthenticatedUser,
        entry_date: date,
        data: JournalEntryWrite,
    ) -> JournalEntryResponse:
        """Create or replace the user's entry for their local date."""
        entry = self.repository.get_owned_by_date(user.user_id, entry_date)
        if entry is None:
            entry = JournalEntry(
                user_id=user.user_id,
                entry_date=entry_date,
                **data.model_dump(),
            )
            self.repository.add(entry)
            try:
                self._commit(entry)
            except IntegrityError:
                self.session.rollback()
                entry = self.repository.get_owned_by_date(user.user_id, entry_date)
                if entry is None:
                    raise
                entry.title = data.title
                entry.content = data.content
                self._commit(entry)
        else:
            entry.title = data.title
            entry.content = data.content
            self._commit(entry)
        return JournalEntryResponse.model_validate(entry)

    def list(
        self,
        user: AuthenticatedUser,
        *,
        limit: int,
        offset: int,
        search: str | None,
    ) -> JournalEntryListResponse:
        """Return the authenticated user's journal history."""
        normalized_search = search.strip() if search else None
        entries = self.repository.list_owned(
            user.user_id,
            limit=limit,
            offset=offset,
            search=normalized_search,
        )
        return JournalEntryListResponse(
            items=[JournalEntryResponse.model_validate(entry) for entry in entries],
            total=self.repository.count_owned(user.user_id, normalized_search),
            limit=limit,
            offset=offset,
        )

    def get(self, user: AuthenticatedUser, entry_id: UUID) -> JournalEntryResponse:
        """Return one owned journal entry."""
        return JournalEntryResponse.model_validate(self._get_owned(user, entry_id))

    def update(
        self,
        user: AuthenticatedUser,
        entry_id: UUID,
        changes: JournalEntryUpdate,
    ) -> JournalEntryResponse:
        """Update one owned journal entry."""
        entry = self._get_owned(user, entry_id)
        for field, value in changes.model_dump(exclude_unset=True).items():
            setattr(entry, field, value)
        self._commit(entry)
        return JournalEntryResponse.model_validate(entry)

    def delete(self, user: AuthenticatedUser, entry_id: UUID) -> None:
        """Delete one owned journal entry."""
        entry = self._get_owned(user, entry_id)
        self.repository.delete(entry)
        self.session.commit()

    def _get_owned(self, user: AuthenticatedUser, entry_id: UUID) -> JournalEntry:
        entry = self.repository.get_owned(entry_id, user.user_id)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Journal entry not found",
            )
        return entry

    def _commit(self, entry: JournalEntry) -> None:
        self.session.commit()
        self.session.refresh(entry)
