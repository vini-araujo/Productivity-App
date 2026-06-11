"""Database models for workout plans and logged sessions."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Exercise(Base):
    """A shared built-in or user-owned custom exercise."""

    __tablename__ = "exercises"
    __table_args__ = (Index("ix_exercises_user_id_name", "user_id", "name"),)

    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[UUID | None] = mapped_column(Uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    muscle_group: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class WorkoutPlan(Base):
    """A shared starter or user-owned workout plan."""

    __tablename__ = "workout_plans"
    __table_args__ = (
        Index("ix_workout_plans_user_id_created_at", "user_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[UUID | None] = mapped_column(Uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class WorkoutPlanDay(Base):
    """An ordered training or rest day inside a workout plan."""

    __tablename__ = "workout_plan_days"
    __table_args__ = (
        Index("ix_workout_plan_days_plan_position", "workout_plan_id", "position"),
        UniqueConstraint(
            "workout_plan_id",
            "position",
            name="uq_workout_plan_days_plan_position",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    workout_plan_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("workout_plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    is_rest_day: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )


class WorkoutPlanExercise(Base):
    """An ordered exercise prescription within one plan day."""

    __tablename__ = "workout_plan_exercises"
    __table_args__ = (
        Index(
            "ix_workout_plan_exercises_day_position", "workout_plan_day_id", "position"
        ),
        CheckConstraint(
            "target_sets BETWEEN 1 AND 20",
            name="ck_workout_plan_exercises_target_sets",
        ),
        UniqueConstraint(
            "workout_plan_day_id",
            "position",
            name="uq_workout_plan_exercises_day_position",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    workout_plan_day_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("workout_plan_days.id", ondelete="CASCADE"),
        nullable=False,
    )
    exercise_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("exercises.id", ondelete="RESTRICT"),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    target_sets: Mapped[int] = mapped_column(Integer, nullable=False)
    target_to_failure: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )


class WorkoutSession(Base):
    """A user-owned workout generated from a plan day."""

    __tablename__ = "workout_sessions"
    __table_args__ = (
        Index("ix_workout_sessions_user_id_started_at", "user_id", "started_at"),
        Index("ix_workout_sessions_user_id_completed_at", "user_id", "completed_at"),
        Index(
            "uq_workout_sessions_one_active_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("completed_at IS NULL"),
            sqlite_where=text("completed_at IS NULL"),
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    workout_plan_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("workout_plans.id", ondelete="SET NULL")
    )
    workout_plan_day_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("workout_plan_days.id", ondelete="SET NULL")
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class WorkoutSet(Base):
    """One ordered set recorded during a workout session."""

    __tablename__ = "workout_sets"
    __table_args__ = (
        Index("ix_workout_sets_session_position", "workout_session_id", "position"),
        CheckConstraint("weight >= 0", name="ck_workout_sets_weight_nonnegative"),
        CheckConstraint(
            "repetitions >= 0",
            name="ck_workout_sets_repetitions_nonnegative",
        ),
        UniqueConstraint(
            "workout_session_id",
            "exercise_position",
            "position",
            name="uq_workout_sets_session_exercise_position",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    workout_session_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("workout_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    exercise_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("exercises.id", ondelete="RESTRICT"), nullable=False
    )
    exercise_name: Mapped[str] = mapped_column(String(120), nullable=False)
    exercise_position: Mapped[int] = mapped_column(Integer, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    weight: Mapped[Decimal | None] = mapped_column(Numeric(7, 2))
    repetitions: Mapped[int | None] = mapped_column(Integer)
    target_to_failure: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    reached_failure: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
