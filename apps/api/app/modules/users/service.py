"""Business logic for user profiles."""

from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser
from app.modules.users.models import Profile
from app.modules.users.repository import ProfileRepository
from app.modules.users.schemas import ProfileResponse, ProfileUpdate


class ProfileService:
    """Manage the authenticated user's application profile."""

    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = ProfileRepository(session)

    def get_or_create(self, user: AuthenticatedUser) -> ProfileResponse:
        """Return the user's profile, creating its initial row when needed."""
        profile = self.repository.get_by_user_id(user.user_id)
        if profile is None:
            profile = Profile(user_id=user.user_id)
            self.repository.add(profile)
            self.session.commit()
            self.session.refresh(profile)
        return self._to_response(profile, user)

    def update(
        self,
        user: AuthenticatedUser,
        changes: ProfileUpdate,
    ) -> ProfileResponse:
        """Update only fields owned by the authenticated user."""
        profile = self.repository.get_by_user_id(user.user_id)
        if profile is None:
            profile = Profile(user_id=user.user_id)
            self.repository.add(profile)

        for field, value in changes.model_dump(exclude_unset=True).items():
            setattr(profile, field, value)

        self.session.commit()
        self.session.refresh(profile)
        return self._to_response(profile, user)

    @staticmethod
    def _to_response(profile: Profile, user: AuthenticatedUser) -> ProfileResponse:
        response = ProfileResponse.model_validate(profile)
        return response.model_copy(update={"email": user.email})
