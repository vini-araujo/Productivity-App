"""Database models for running activity."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Index,
    Integer,
    Numeric,
    Text,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RunSession(Base):
    """A manually logged run owned by one authenticated user."""

    __tablename__ = "run_sessions"
    __table_args__ = (
        Index("ix_run_sessions_user_id_started_at", "user_id", "started_at"),
        CheckConstraint("distance_km > 0", name="ck_run_sessions_distance_positive"),
        CheckConstraint(
            "duration_seconds > 0", name="ck_run_sessions_duration_positive"
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    distance_km: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
