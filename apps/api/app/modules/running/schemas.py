"""API schemas for running activity."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RunWrite(BaseModel):
    """Fields accepted when logging a run."""

    started_at: datetime
    distance_km: Decimal = Field(gt=0, le=9999, decimal_places=2)
    duration_seconds: int = Field(gt=0, le=604800)
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("started_at")
    @classmethod
    def validate_started_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("started_at must include a timezone")
        return value

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class RunUpdate(BaseModel):
    """Fields accepted when editing a run."""

    started_at: datetime | None = None
    distance_km: Decimal | None = Field(default=None, gt=0, le=9999, decimal_places=2)
    duration_seconds: int | None = Field(default=None, gt=0, le=604800)
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("started_at")
    @classmethod
    def validate_started_at(cls, value: datetime | None) -> datetime:
        if value is None:
            raise ValueError("started_at cannot be null")
        if value.tzinfo is None:
            raise ValueError("started_at must include a timezone")
        return value

    @field_validator("distance_km")
    @classmethod
    def validate_distance(cls, value: Decimal | None) -> Decimal:
        if value is None:
            raise ValueError("distance_km cannot be null")
        return value

    @field_validator("duration_seconds")
    @classmethod
    def validate_duration(cls, value: int | None) -> int:
        if value is None:
            raise ValueError("duration_seconds cannot be null")
        return value

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class RunResponse(BaseModel):
    """A user-owned run returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    started_at: datetime
    distance_km: Decimal
    duration_seconds: int
    notes: str | None
    created_at: datetime
    updated_at: datetime


class RunListResponse(BaseModel):
    """Paginated running history."""

    items: list[RunResponse]
    total: int
    limit: int
    offset: int
