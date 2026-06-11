"""Create user-owned daily journal entries.

Revision ID: 20260611_0005
Revises: 20260611_0004
Create Date: 2026-06-11
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260611_0005"
down_revision: str | None = "20260611_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the daily journal table and ownership constraints."""
    op.create_table(
        "journal_entries",
        sa.Column(
            "id",
            sa.Uuid(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
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
            name="fk_journal_entries_user_id_auth_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "entry_date",
            name="uq_journal_entries_user_id_entry_date",
        ),
    )
    op.create_index(
        "ix_journal_entries_user_id_entry_date",
        "journal_entries",
        ["user_id", "entry_date"],
    )
    op.execute("ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    """Drop user-owned daily journal entries."""
    op.drop_index("ix_journal_entries_user_id_entry_date", table_name="journal_entries")
    op.drop_table("journal_entries")
