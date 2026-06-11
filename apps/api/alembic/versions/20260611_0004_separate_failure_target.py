"""Separate planned failure targets from recorded results.

Revision ID: 20260611_0004
Revises: 20260611_0003
Create Date: 2026-06-11
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260611_0004"
down_revision: str | None = "20260611_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Store the prescription separately from the performed result."""
    op.add_column(
        "workout_sets",
        sa.Column(
            "target_to_failure",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Remove the failure-target snapshot."""
    op.drop_column("workout_sets", "target_to_failure")
