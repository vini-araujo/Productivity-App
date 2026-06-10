"""HTTP routes for the authenticated user's profile."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import get_session
from app.modules.users.schemas import ProfileResponse, ProfileUpdate
from app.modules.users.service import ProfileService

router = APIRouter(prefix="/api/v1", tags=["profile"])


def get_profile_service(
    session: Annotated[Session, Depends(get_session)],
) -> ProfileService:
    """Build a profile service for the current request."""
    return ProfileService(session)


@router.get("/me", response_model=ProfileResponse, summary="Get current profile")
def get_me(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[ProfileService, Depends(get_profile_service)],
) -> ProfileResponse:
    """Return the authenticated user's application profile."""
    return service.get_or_create(user)


@router.patch("/me", response_model=ProfileResponse, summary="Update current profile")
def update_me(
    changes: ProfileUpdate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[ProfileService, Depends(get_profile_service)],
) -> ProfileResponse:
    """Update the authenticated user's allowed profile fields."""
    return service.update(user, changes)
