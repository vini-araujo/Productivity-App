"""API schemas for workout plans and sessions."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def normalize_required(value: str) -> str:
    """Trim and require a meaningful string."""
    normalized = value.strip()
    if not normalized:
        raise ValueError("value cannot be blank")
    return normalized


class ExerciseCreate(BaseModel):
    """Fields accepted when creating a custom exercise."""

    name: str = Field(min_length=1, max_length=120)
    muscle_group: str | None = Field(default=None, max_length=80)

    _normalize_name = field_validator("name")(normalize_required)


class ExerciseResponse(BaseModel):
    """A visible shared or custom exercise."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    muscle_group: str | None
    is_builtin: bool


class PlanExerciseInput(BaseModel):
    """One exercise prescription in a plan day."""

    exercise_id: UUID
    target_sets: int = Field(default=2, ge=1, le=20)
    target_to_failure: bool = False


class PlanDayInput(BaseModel):
    """One ordered day in a plan definition."""

    name: str = Field(min_length=1, max_length=120)
    is_rest_day: bool = False
    exercises: list[PlanExerciseInput] = Field(default_factory=list, max_length=30)

    _normalize_name = field_validator("name")(normalize_required)

    @model_validator(mode="after")
    def validate_day(self) -> "PlanDayInput":
        if self.is_rest_day and self.exercises:
            raise ValueError("rest days cannot contain exercises")
        if not self.is_rest_day and not self.exercises:
            raise ValueError("training days require at least one exercise")
        exercise_ids = [exercise.exercise_id for exercise in self.exercises]
        if len(exercise_ids) != len(set(exercise_ids)):
            raise ValueError("training days cannot repeat an exercise")
        return self


class WorkoutPlanCreate(BaseModel):
    """A complete user-owned workout-plan definition."""

    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    days: list[PlanDayInput] = Field(min_length=1, max_length=14)

    _normalize_name = field_validator("name")(normalize_required)


class PlanExerciseResponse(BaseModel):
    """An exercise prescription returned with a plan."""

    id: UUID
    exercise_id: UUID
    exercise_name: str
    position: int
    target_sets: int
    target_to_failure: bool


class PlanDayResponse(BaseModel):
    """A plan day and its ordered exercises."""

    id: UUID
    name: str
    position: int
    is_rest_day: bool
    exercises: list[PlanExerciseResponse]


class WorkoutPlanResponse(BaseModel):
    """A shared or user-owned workout plan."""

    id: UUID
    name: str
    description: str | None
    is_builtin: bool
    days: list[PlanDayResponse]


class WorkoutSetUpdate(BaseModel):
    """Editable values for one generated workout set."""

    weight: Decimal | None = Field(default=None, ge=0, max_digits=7, decimal_places=2)
    repetitions: int | None = Field(default=None, ge=0, le=1000)
    reached_failure: bool | None = None
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("reached_failure")
    @classmethod
    def validate_reached_failure(cls, value: bool | None) -> bool:
        if value is None:
            raise ValueError("reached_failure cannot be null")
        return value


class WorkoutSetResponse(BaseModel):
    """One set inside a workout session."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    exercise_id: UUID
    exercise_name: str
    exercise_position: int
    position: int
    weight: Decimal | None
    repetitions: int | None
    target_to_failure: bool
    reached_failure: bool
    notes: str | None


class WorkoutSessionUpdate(BaseModel):
    """Editable session-level values."""

    notes: str | None = Field(default=None, max_length=2000)
    completed: bool | None = None

    @field_validator("completed")
    @classmethod
    def validate_completed(cls, value: bool | None) -> bool:
        if value is None:
            raise ValueError("completed cannot be null")
        return value


class WorkoutSessionResponse(BaseModel):
    """A user-owned workout session with generated sets."""

    id: UUID
    workout_plan_id: UUID | None
    workout_plan_day_id: UUID | None
    name: str
    notes: str | None
    started_at: datetime
    completed_at: datetime | None
    sets: list[WorkoutSetResponse]
