"""Tests for protected profile behavior."""

from collections.abc import Generator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import httpx
import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import Base
from app.main import app
from app.modules.users.router import get_profile_service
from app.modules.users.schemas import ProfileResponse, ProfileUpdate
from app.modules.users.service import ProfileService


@pytest.fixture
def session() -> Generator[Session]:
    """Provide an isolated in-memory profile database."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as database_session:
        yield database_session


def test_profile_service_creates_reads_and_updates_owned_profile(
    session: Session,
) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email="user@example.com")
    service = ProfileService(session)

    created = service.get_or_create(user)
    loaded = service.get_or_create(user)
    updated = service.update(
        user,
        ProfileUpdate(
            display_name="  Vini  ",
            timezone="America/Sao_Paulo",
            locale="pt-BR",
        ),
    )

    assert created.user_id == user.user_id
    assert loaded.id == created.id
    assert updated.display_name == "Vini"
    assert updated.timezone == "America/Sao_Paulo"
    assert updated.locale == "pt-BR"
    assert updated.email == "user@example.com"


def test_profile_service_update_creates_missing_profile(session: Session) -> None:
    user = AuthenticatedUser(user_id=uuid4(), email=None)

    profile = ProfileService(session).update(user, ProfileUpdate(display_name=""))

    assert profile.user_id == user.user_id
    assert profile.display_name is None


@pytest.mark.parametrize(
    "changes",
    [
        {"timezone": None},
        {"timezone": "Not/A_Timezone"},
        {"locale": None},
        {"locale": "es-ES"},
    ],
)
def test_profile_update_rejects_invalid_preferences(changes: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        ProfileUpdate.model_validate(changes)


class FakeProfileService:
    """Profile service test double used at the HTTP boundary."""

    def __init__(self, profile: ProfileResponse) -> None:
        self.profile = profile

    def get_or_create(self, user: AuthenticatedUser) -> ProfileResponse:
        assert user.user_id == self.profile.user_id
        return self.profile

    def update(
        self,
        user: AuthenticatedUser,
        changes: ProfileUpdate,
    ) -> ProfileResponse:
        assert user.user_id == self.profile.user_id
        return self.profile.model_copy(update=changes.model_dump(exclude_unset=True))


@pytest.mark.anyio
async def test_profile_endpoints_require_authentication() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/me")

    assert response.status_code == 401


@pytest.mark.anyio
async def test_profile_endpoints_return_and_update_current_user() -> None:
    user_id = uuid4()
    now = datetime.now(UTC)
    profile = ProfileResponse(
        id=uuid4(),
        user_id=user_id,
        email="user@example.com",
        display_name=None,
        timezone="UTC",
        locale="en-US",
        created_at=now,
        updated_at=now,
    )
    service = FakeProfileService(profile)
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        user_id=user_id,
        email="user@example.com",
    )
    app.dependency_overrides[get_profile_service] = lambda: service

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            get_response = await client.get("/api/v1/me")
            patch_response = await client.patch(
                "/api/v1/me",
                json={"display_name": "Vini"},
            )
    finally:
        app.dependency_overrides.clear()

    assert get_response.status_code == 200
    assert UUID(get_response.json()["user_id"]) == user_id
    assert patch_response.status_code == 200
    assert patch_response.json()["display_name"] == "Vini"
