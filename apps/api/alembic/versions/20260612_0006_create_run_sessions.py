"""Create user-owned run sessions.

Revision ID: 20260612_0006
Revises: 20260611_0005
Create Date: 2026-06-12
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260612_0006"
down_revision: str | None = "20260611_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "run_sessions",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("distance_km", sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("distance_km > 0", name="ck_run_sessions_distance_positive"),
        sa.CheckConstraint(
            "duration_seconds > 0", name="ck_run_sessions_duration_positive"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["auth.users.id"],
            name="fk_run_sessions_user_id_auth_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_run_sessions_user_id_started_at",
        "run_sessions",
        ["user_id", "started_at"],
    )
    op.execute("ALTER TABLE public.run_sessions ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index("ix_run_sessions_user_id_started_at", table_name="run_sessions")
    op.drop_table("run_sessions")
