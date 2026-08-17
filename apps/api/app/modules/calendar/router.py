"""HTTP routes for authenticated calendar aggregation."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import get_session
from app.modules.calendar.schemas import ActivitySummaryResponse, CalendarResponse
from app.modules.calendar.service import CalendarService

router = APIRouter(prefix="/api/v1/calendar", tags=["calendar"])


def get_calendar_service(
    session: Annotated[Session, Depends(get_session)],
) -> CalendarService:
    """Build a calendar service for the current request."""
    return CalendarService(session)


@router.get("", response_model=CalendarResponse)
def get_calendar(
    start_date: date,
    end_date: date,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[CalendarService, Depends(get_calendar_service)],
) -> CalendarResponse:
    """Return an authenticated, user-scoped calendar snapshot."""
    return service.get(user, start_date, end_date)


@router.get("/activity-summary", response_model=ActivitySummaryResponse)
def get_activity_summary(
    start_date: date,
    end_date: date,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[CalendarService, Depends(get_calendar_service)],
) -> ActivitySummaryResponse:
    """Return authenticated, user-scoped dashboard activity counts."""
    return service.get_activity_summary(user, start_date, end_date)
