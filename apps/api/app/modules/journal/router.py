"""HTTP routes for user-owned daily journal entries."""

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import get_session
from app.modules.journal.schemas import (
    JournalEntryListResponse,
    JournalEntryResponse,
    JournalEntryUpdate,
    JournalEntryWrite,
)
from app.modules.journal.service import JournalService

router = APIRouter(prefix="/api/v1/journal/entries", tags=["journal"])


def get_journal_service(
    session: Annotated[Session, Depends(get_session)],
) -> JournalService:
    """Build a journal service for the current request."""
    return JournalService(session)


@router.get("", response_model=JournalEntryListResponse)
def list_entries(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[JournalService, Depends(get_journal_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query(max_length=200)] = None,
) -> JournalEntryListResponse:
    """List journal entries owned by the authenticated user."""
    return service.list(user, limit=limit, offset=offset, search=search)


@router.get("/today", response_model=JournalEntryResponse | None)
def get_today_entry(
    entry_date: date,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[JournalService, Depends(get_journal_service)],
) -> JournalEntryResponse | None:
    """Return the entry for the user's supplied local date."""
    return service.get_today(user, entry_date)


@router.put("/today", response_model=JournalEntryResponse)
def save_today_entry(
    entry_date: date,
    data: JournalEntryWrite,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[JournalService, Depends(get_journal_service)],
) -> JournalEntryResponse:
    """Create or replace the entry for the user's supplied local date."""
    return service.save_today(user, entry_date, data)


@router.get("/{entry_id}", response_model=JournalEntryResponse)
def get_entry(
    entry_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[JournalService, Depends(get_journal_service)],
) -> JournalEntryResponse:
    """Return one owned journal entry."""
    return service.get(user, entry_id)


@router.patch("/{entry_id}", response_model=JournalEntryResponse)
def update_entry(
    entry_id: UUID,
    changes: JournalEntryUpdate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[JournalService, Depends(get_journal_service)],
) -> JournalEntryResponse:
    """Update one owned journal entry."""
    return service.update(user, entry_id, changes)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[JournalService, Depends(get_journal_service)],
) -> Response:
    """Delete one owned journal entry."""
    service.delete(user, entry_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
