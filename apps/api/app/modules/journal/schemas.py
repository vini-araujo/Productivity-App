"""API schemas for daily journal entries."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class JournalEntryWrite(BaseModel):
    """Fields accepted when saving a journal entry."""

    title: str | None = Field(default=None, max_length=200)
    content: str = Field(min_length=1, max_length=50_000)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        """Store blank titles as null."""
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        """Require meaningful content while preserving journal formatting."""
        if not value.strip():
            raise ValueError("content cannot be blank")
        return value


class JournalEntryUpdate(BaseModel):
    """Fields accepted when updating an existing journal entry."""

    title: str | None = Field(default=None, max_length=200)
    content: str | None = Field(default=None, min_length=1, max_length=50_000)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        """Store blank titles as null."""
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str | None) -> str:
        """Reject null or blank content when supplied."""
        if value is None or not value.strip():
            raise ValueError("content cannot be blank")
        return value


class JournalEntryResponse(BaseModel):
    """A user-owned journal entry returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    entry_date: date
    title: str | None
    content: str
    created_at: datetime
    updated_at: datetime


class JournalEntryListResponse(BaseModel):
    """Paginated journal entries owned by the authenticated user."""

    items: list[JournalEntryResponse]
    total: int
    limit: int
    offset: int
