"""Tests for user-owned daily journal behavior."""

from collections.abc import Generator
from datetime import UTC, date, datetime
from uuid import UUID, uuid4

import httpx
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import Base
from app.main import app
from app.modules.journal.router import get_journal_service
from app.modules.journal.schemas import (
    JournalEntryListResponse,
    JournalEntryResponse,
    JournalEntryUpdate,
    JournalEntryWrite,
)
from app.modules.journal.service import JournalService


@pytest.fixture
def session() -> Generator[Session]:
    """Provide an isolated in-memory journal database."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as database_session:
        yield database_session


def test_journal_service_upserts_one_entry_per_date(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    service = JournalService(session)
    entry_date = date(2026, 6, 11)

    created = service.save_today(
        user,
        entry_date,
        JournalEntryWrite(title="  First title  ", content="First reflection."),
    )
    updated = service.save_today(
        user,
        entry_date,
        JournalEntryWrite(title="", content="Revised reflection."),
    )

    assert updated.id == created.id
    assert updated.title is None
    assert updated.content == "Revised reflection."
    assert service.get_today(user, entry_date) == updated
    assert service.list(user, limit=20, offset=0, search=None).total == 1


def test_journal_service_recovers_from_concurrent_first_save(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    service = JournalService(session)
    entry_date = date(2026, 6, 11)
    winner = service.save_today(
        user,
        entry_date,
        JournalEntryWrite(content="First tab."),
    )
    original_get = service.repository.get_owned_by_date
    original_commit = service._commit
    calls = 0

    def race_get(user_id: UUID, requested_date: date):
        nonlocal calls
        calls += 1
        return None if calls == 1 else original_get(user_id, requested_date)

    def race_commit(entry) -> None:
        if entry.id != winner.id:
            raise IntegrityError("insert", {}, Exception("unique conflict"))
        original_commit(entry)

    monkeypatch.setattr(service.repository, "get_owned_by_date", race_get)
    monkeypatch.setattr(service, "_commit", race_commit)

    saved = service.save_today(
        user,
        entry_date,
        JournalEntryWrite(content="Second tab."),
    )

    assert saved.id == winner.id
    assert saved.content == "Second tab."
    assert service.list(user, limit=20, offset=0, search=None).total == 1


def test_journal_service_scopes_every_operation_by_user(session: Session) -> None:
    owner = AuthenticatedUser(user_id=uuid4(), email=None)
    stranger = AuthenticatedUser(user_id=uuid4(), email=None)
    service = JournalService(session)
    entry = service.save_today(
        owner,
        date(2026, 6, 11),
        JournalEntryWrite(content="Private reflection."),
    )

    assert service.get_today(stranger, entry.entry_date) is None
    assert service.list(stranger, limit=20, offset=0, search=None).total == 0

    for action in (
        lambda: service.get(stranger, entry.id),
        lambda: service.update(
            stranger,
            entry.id,
            JournalEntryUpdate(content="Stolen"),
        ),
        lambda: service.delete(stranger, entry.id),
    ):
        with pytest.raises(HTTPException) as error:
            action()
        assert error.value.status_code == 404


def test_journal_service_searches_and_paginates_history(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    service = JournalService(session)
    service.save_today(
        user,
        date(2026, 6, 10),
        JournalEntryWrite(title="Training", content="Strong upper session."),
    )
    newest = service.save_today(
        user,
        date(2026, 6, 11),
        JournalEntryWrite(title="Quiet morning", content="Read with coffee."),
    )

    history = service.list(user, limit=1, offset=0, search=None)
    search = service.list(user, limit=20, offset=0, search=" upper ")

    assert history.total == 2
    assert history.items == [newest]
    assert search.total == 1
    assert search.items[0].title == "Training"


def test_journal_service_updates_and_deletes_owned_entry(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)
    service = JournalService(session)
    entry = service.save_today(
        user,
        date(2026, 6, 11),
        JournalEntryWrite(content="Original."),
    )

    updated = service.update(
        user,
        entry.id,
        JournalEntryUpdate(title="Reflection", content="Updated."),
    )
    service.delete(user, entry.id)

    assert updated.title == "Reflection"
    assert updated.content == "Updated."
    assert service.get_today(user, entry.entry_date) is None


@pytest.mark.parametrize(
    ("schema", "data"),
    [
        (JournalEntryWrite, {"content": "   "}),
        (JournalEntryWrite, {"content": ""}),
        (JournalEntryUpdate, {"content": None}),
        (JournalEntryUpdate, {"content": " \n "}),
    ],
)
def test_journal_schemas_reject_blank_content(
    schema: type[JournalEntryWrite] | type[JournalEntryUpdate],
    data: dict[str, object],
) -> None:
    with pytest.raises(ValidationError):
        schema.model_validate(data)


class FakeJournalService:
    """Journal service test double used at the HTTP boundary."""

    def __init__(self, entry: JournalEntryResponse) -> None:
        self.entry = entry
        self.deleted_entry_id: UUID | None = None

    def get_today(
        self,
        user: AuthenticatedUser,
        entry_date: date,
    ) -> JournalEntryResponse | None:
        assert user.user_id and entry_date == self.entry.entry_date
        return self.entry

    def save_today(
        self,
        user: AuthenticatedUser,
        entry_date: date,
        data: JournalEntryWrite,
    ) -> JournalEntryResponse:
        assert user.user_id and entry_date == self.entry.entry_date
        return self.entry.model_copy(update=data.model_dump())

    def list(
        self,
        user: AuthenticatedUser,
        *,
        limit: int,
        offset: int,
        search: str | None,
    ) -> JournalEntryListResponse:
        assert user.user_id and search is None
        return JournalEntryListResponse(
            items=[self.entry],
            total=1,
            limit=limit,
            offset=offset,
        )

    def get(self, user: AuthenticatedUser, entry_id: UUID) -> JournalEntryResponse:
        assert user.user_id and entry_id == self.entry.id
        return self.entry

    def update(
        self,
        user: AuthenticatedUser,
        entry_id: UUID,
        changes: JournalEntryUpdate,
    ) -> JournalEntryResponse:
        assert user.user_id and entry_id == self.entry.id
        return self.entry.model_copy(update=changes.model_dump(exclude_unset=True))

    def delete(self, user: AuthenticatedUser, entry_id: UUID) -> None:
        assert user.user_id
        self.deleted_entry_id = entry_id


@pytest.mark.anyio
async def test_journal_endpoints_require_authentication() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        responses = [
            await client.get("/api/v1/journal/entries"),
            await client.get(
                "/api/v1/journal/entries/today",
                params={"entry_date": "2026-06-11"},
            ),
        ]

    assert all(response.status_code == 401 for response in responses)


@pytest.mark.anyio
async def test_journal_endpoints_support_daily_workflow() -> None:
    user_id = uuid4()
    entry_id = uuid4()
    now = datetime.now(UTC)
    entry = JournalEntryResponse(
        id=entry_id,
        entry_date=date(2026, 6, 11),
        title=None,
        content="Reflection.",
        created_at=now,
        updated_at=now,
    )
    service = FakeJournalService(entry)
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        user_id=user_id,
        email=None,
    )
    app.dependency_overrides[get_journal_service] = lambda: service

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            list_response = await client.get("/api/v1/journal/entries")
            today_response = await client.get(
                "/api/v1/journal/entries/today",
                params={"entry_date": "2026-06-11"},
            )
            save_response = await client.put(
                "/api/v1/journal/entries/today",
                params={"entry_date": "2026-06-11"},
                json={"content": "Saved reflection."},
            )
            get_response = await client.get(f"/api/v1/journal/entries/{entry_id}")
            patch_response = await client.patch(
                f"/api/v1/journal/entries/{entry_id}",
                json={"title": "Updated"},
            )
            delete_response = await client.delete(f"/api/v1/journal/entries/{entry_id}")
    finally:
        app.dependency_overrides.clear()

    assert list_response.status_code == 200
    assert today_response.status_code == 200
    assert save_response.json()["content"] == "Saved reflection."
    assert get_response.status_code == 200
    assert patch_response.json()["title"] == "Updated"
    assert delete_response.status_code == 204
    assert service.deleted_entry_id == entry_id
