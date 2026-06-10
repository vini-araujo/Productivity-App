"""Persistence operations for user profiles."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.users.models import Profile


class ProfileRepository:
    """Read and write application profiles."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_user_id(self, user_id: UUID) -> Profile | None:
        """Return the profile owned by a Supabase user."""
        return self.session.scalar(select(Profile).where(Profile.user_id == user_id))

    def add(self, profile: Profile) -> None:
        """Stage a new profile for persistence."""
        self.session.add(profile)
