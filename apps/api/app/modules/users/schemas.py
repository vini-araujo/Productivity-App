"""API schemas for user profiles."""

from datetime import datetime
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator

SupportedLocale = Literal["en-US", "pt-BR"]


class ProfileUpdate(BaseModel):
    """Fields an authenticated user may update on their profile."""

    display_name: str | None = Field(default=None, max_length=80)
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    locale: SupportedLocale | None = None

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str | None) -> str | None:
        """Store blank display names as null and trim surrounding whitespace."""
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str | None) -> str:
        """Require a valid IANA timezone when the field is supplied."""
        if value is None:
            raise ValueError("timezone cannot be null")
        normalized = value.strip()
        try:
            ZoneInfo(normalized)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("timezone must be a valid IANA timezone") from exc
        return normalized

    @field_validator("locale")
    @classmethod
    def validate_locale(cls, value: SupportedLocale | None) -> SupportedLocale:
        """Reject explicit null while allowing the field to be omitted."""
        if value is None:
            raise ValueError("locale cannot be null")
        return value


class ProfileResponse(BaseModel):
    """Authenticated user's application profile."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    email: str | None = None
    display_name: str | None
    timezone: str
    locale: SupportedLocale
    created_at: datetime
    updated_at: datetime
