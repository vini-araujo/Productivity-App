"""API schemas for tasks."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

TaskPriority = Literal["low", "medium", "high"]


class TaskCreate(BaseModel):
    """Fields accepted when creating a task."""

    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    due_at: datetime | None = None
    priority: TaskPriority = "medium"

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        """Require meaningful task titles."""
        normalized = value.strip()
        if not normalized:
            raise ValueError("title cannot be blank")
        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        """Store blank descriptions as null."""
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("due_at")
    @classmethod
    def validate_due_at(cls, value: datetime | None) -> datetime | None:
        """Require timezone-aware due dates."""
        if value is not None and value.tzinfo is None:
            raise ValueError("due_at must include a timezone")
        return value


class TaskUpdate(BaseModel):
    """Fields accepted when updating a task."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    due_at: datetime | None = None
    priority: TaskPriority | None = None
    completed: bool | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str:
        """Reject null or blank titles when supplied."""
        if value is None:
            raise ValueError("title cannot be null")
        normalized = value.strip()
        if not normalized:
            raise ValueError("title cannot be blank")
        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        """Store blank descriptions as null."""
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("due_at")
    @classmethod
    def validate_due_at(cls, value: datetime | None) -> datetime | None:
        """Require timezone-aware due dates while allowing null to clear them."""
        if value is not None and value.tzinfo is None:
            raise ValueError("due_at must include a timezone")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: TaskPriority | None) -> TaskPriority:
        """Reject explicit null priorities while allowing omission."""
        if value is None:
            raise ValueError("priority cannot be null")
        return value

    @field_validator("completed")
    @classmethod
    def validate_completed(cls, value: bool | None) -> bool:
        """Reject explicit null completion state while allowing omission."""
        if value is None:
            raise ValueError("completed cannot be null")
        return value


class TaskResponse(BaseModel):
    """A user-owned task returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    due_at: datetime | None
    priority: TaskPriority
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class TaskListResponse(BaseModel):
    """Paginated tasks owned by the authenticated user."""

    items: list[TaskResponse]
    total: int
    limit: int
    offset: int
