"""Create user-owned tasks.

Revision ID: 20260610_0002
Revises: 20260609_0001
Create Date: 2026-06-10
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260610_0002"
down_revision: str | None = "20260609_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the tasks table and ownership indexes."""
    op.create_table(
        "tasks",
        sa.Column(
            "id",
            sa.Uuid(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "priority",
            sa.String(length=10),
            server_default="medium",
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["auth.users.id"],
            name="fk_tasks_user_id_auth_users",
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "priority IN ('low', 'medium', 'high')",
            name="ck_tasks_priority",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_tasks_user_id_created_at",
        "tasks",
        ["user_id", "created_at"],
    )
    op.create_index(
        "ix_tasks_user_id_completed_at",
        "tasks",
        ["user_id", "completed_at"],
    )
    op.execute("ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    """Drop user-owned tasks."""
    op.drop_index("ix_tasks_user_id_completed_at", table_name="tasks")
    op.drop_index("ix_tasks_user_id_created_at", table_name="tasks")
    op.drop_table("tasks")
