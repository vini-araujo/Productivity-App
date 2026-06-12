"""HTTP routes for the authenticated dashboard snapshot."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import get_session
from app.modules.dashboard.schemas import DashboardResponse
from app.modules.dashboard.service import DashboardService

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


def get_dashboard_service(
    session: Annotated[Session, Depends(get_session)],
) -> DashboardService:
    """Build a dashboard service for the current request."""
    return DashboardService(session)


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    local_date: date,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[DashboardService, Depends(get_dashboard_service)],
) -> DashboardResponse:
    """Return an authenticated, user-scoped dashboard snapshot."""
    return service.get(user, local_date)
