"""Database models for user profiles."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, String, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Profile(Base):
    """Application-owned profile linked to one Supabase Auth user."""

    __tablename__ = "profiles"
    __table_args__ = (
        CheckConstraint(
            "locale IN ('en-US', 'pt-BR')",
            name="ck_profiles_locale",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[UUID] = mapped_column(Uuid, unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(80))
    timezone: Mapped[str] = mapped_column(
        String(64),
        default="UTC",
        server_default="UTC",
    )
    locale: Mapped[str] = mapped_column(
        String(10),
        default="en-US",
        server_default="en-US",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
