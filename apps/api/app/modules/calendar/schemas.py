"""API schemas for calendar aggregation."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

CalendarItemKind = Literal["task", "workout", "run", "journal"]
ActivityKind = CalendarItemKind


class CalendarItem(BaseModel):
    """One normalized read-only calendar item."""

    kind: CalendarItemKind
    source_id: UUID
    title: str
    date: date
    timestamp: datetime | None
    status: str
    detail: str | None
    href: str


class CalendarResponse(BaseModel):
    """Calendar items for an authenticated user and date range."""

    start_date: date
    end_date: date
    items: list[CalendarItem]


class ActivityDay(BaseModel):
    """Daily activity counts for the dashboard frequency grid."""

    date: date
    counts: dict[ActivityKind, int]
    total: int


class ActivitySummaryResponse(BaseModel):
    """Year-scale activity counts for an authenticated user."""

    start_date: date
    end_date: date
    days: list[ActivityDay]
