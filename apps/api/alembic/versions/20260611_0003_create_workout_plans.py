"""Create plan-first gym workout tracking.

Revision ID: 20260611_0003
Revises: 20260610_0002
Create Date: 2026-06-11
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260611_0003"
down_revision: str | None = "20260610_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create workout plans, generated sessions, and the starter split."""
    op.create_table(
        "exercises",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("muscle_group", sa.String(length=80), nullable=True),
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
            name="fk_exercises_user_id_auth_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_exercises_user_id_name", "exercises", ["user_id", "name"])

    op.create_table(
        "workout_plans",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
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
            name="fk_workout_plans_user_id_auth_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_workout_plans_user_id_created_at",
        "workout_plans",
        ["user_id", "created_at"],
    )

    op.create_table(
        "workout_plan_days",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("workout_plan_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("is_rest_day", sa.Boolean(), server_default="false", nullable=False),
        sa.ForeignKeyConstraint(
            ["workout_plan_id"], ["workout_plans.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workout_plan_id", "position", name="uq_workout_plan_days_plan_position"
        ),
    )
    op.create_index(
        "ix_workout_plan_days_plan_position",
        "workout_plan_days",
        ["workout_plan_id", "position"],
    )

    op.create_table(
        "workout_plan_exercises",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("workout_plan_day_id", sa.Uuid(), nullable=False),
        sa.Column("exercise_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("target_sets", sa.Integer(), nullable=False),
        sa.Column(
            "target_to_failure", sa.Boolean(), server_default="false", nullable=False
        ),
        sa.CheckConstraint(
            "target_sets BETWEEN 1 AND 20", name="ck_workout_plan_exercises_target_sets"
        ),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["workout_plan_day_id"], ["workout_plan_days.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workout_plan_day_id",
            "position",
            name="uq_workout_plan_exercises_day_position",
        ),
    )
    op.create_index(
        "ix_workout_plan_exercises_day_position",
        "workout_plan_exercises",
        ["workout_plan_day_id", "position"],
    )

    op.create_table(
        "workout_sessions",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("workout_plan_id", sa.Uuid(), nullable=True),
        sa.Column("workout_plan_day_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
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
            name="fk_workout_sessions_user_id_auth_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["workout_plan_day_id"], ["workout_plan_days.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["workout_plan_id"], ["workout_plans.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_workout_sessions_user_id_started_at",
        "workout_sessions",
        ["user_id", "started_at"],
    )
    op.create_index(
        "ix_workout_sessions_user_id_completed_at",
        "workout_sessions",
        ["user_id", "completed_at"],
    )
    op.create_index(
        "uq_workout_sessions_one_active_per_user",
        "workout_sessions",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("completed_at IS NULL"),
    )

    op.create_table(
        "workout_sets",
        sa.Column(
            "id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("workout_session_id", sa.Uuid(), nullable=False),
        sa.Column("exercise_id", sa.Uuid(), nullable=False),
        sa.Column("exercise_name", sa.String(length=120), nullable=False),
        sa.Column("exercise_position", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("weight", sa.Numeric(precision=7, scale=2), nullable=True),
        sa.Column("repetitions", sa.Integer(), nullable=True),
        sa.Column(
            "reached_failure", sa.Boolean(), server_default="false", nullable=False
        ),
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
        sa.CheckConstraint("weight >= 0", name="ck_workout_sets_weight_nonnegative"),
        sa.CheckConstraint(
            "repetitions >= 0", name="ck_workout_sets_repetitions_nonnegative"
        ),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["workout_session_id"], ["workout_sessions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workout_session_id",
            "exercise_position",
            "position",
            name="uq_workout_sets_session_exercise_position",
        ),
    )
    op.create_index(
        "ix_workout_sets_session_position",
        "workout_sets",
        ["workout_session_id", "position"],
    )

    for table in (
        "exercises",
        "workout_plans",
        "workout_plan_days",
        "workout_plan_exercises",
        "workout_sessions",
        "workout_sets",
    ):
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")

    _seed_starter_split()


def _seed_starter_split() -> None:
    """Insert the shared U/L/Rest starter plan and exercise catalog."""
    exercise_rows = [
        ("00000000-0000-0000-0000-000000000201", "Incline Bench Press", "Chest"),
        ("00000000-0000-0000-0000-000000000202", "Pull-Up", "Back"),
        ("00000000-0000-0000-0000-000000000203", "Pec Deck", "Chest"),
        ("00000000-0000-0000-0000-000000000204", "High Row", "Back"),
        ("00000000-0000-0000-0000-000000000205", "Triceps Pushdown", "Triceps"),
        ("00000000-0000-0000-0000-000000000206", "Biceps Curl", "Biceps"),
        ("00000000-0000-0000-0000-000000000207", "Low Row", "Back"),
        ("00000000-0000-0000-0000-000000000208", "Leg Raise", "Core"),
        ("00000000-0000-0000-0000-000000000209", "Hamstring Curl", "Hamstrings"),
        ("00000000-0000-0000-0000-000000000210", "Squat", "Quadriceps"),
        ("00000000-0000-0000-0000-000000000211", "Leg Extension", "Quadriceps"),
        ("00000000-0000-0000-0000-000000000212", "Hip Adduction", "Adductors"),
        ("00000000-0000-0000-0000-000000000213", "Romanian Deadlift", "Hamstrings"),
    ]
    exercises = sa.table(
        "exercises",
        sa.column("id", sa.Uuid()),
        sa.column("user_id", sa.Uuid()),
        sa.column("name", sa.String()),
        sa.column("muscle_group", sa.String()),
    )
    op.bulk_insert(
        exercises,
        [
            {"id": id_, "user_id": None, "name": name, "muscle_group": group}
            for id_, name, group in exercise_rows
        ],
    )

    plans = sa.table(
        "workout_plans",
        sa.column("id", sa.Uuid()),
        sa.column("user_id", sa.Uuid()),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
    )
    op.bulk_insert(
        plans,
        [
            {
                "id": "00000000-0000-0000-0000-000000000100",
                "user_id": None,
                "name": "U/L/Rest Starter Split",
                "description": "Two working sets per exercise, performed to failure.",
            }
        ],
    )

    days = sa.table(
        "workout_plan_days",
        sa.column("id", sa.Uuid()),
        sa.column("workout_plan_id", sa.Uuid()),
        sa.column("name", sa.String()),
        sa.column("position", sa.Integer()),
        sa.column("is_rest_day", sa.Boolean()),
    )
    op.bulk_insert(
        days,
        [
            {
                "id": "00000000-0000-0000-0000-000000000101",
                "workout_plan_id": "00000000-0000-0000-0000-000000000100",
                "name": "Upper",
                "position": 0,
                "is_rest_day": False,
            },
            {
                "id": "00000000-0000-0000-0000-000000000102",
                "workout_plan_id": "00000000-0000-0000-0000-000000000100",
                "name": "Lower",
                "position": 1,
                "is_rest_day": False,
            },
            {
                "id": "00000000-0000-0000-0000-000000000103",
                "workout_plan_id": "00000000-0000-0000-0000-000000000100",
                "name": "Rest",
                "position": 2,
                "is_rest_day": True,
            },
        ],
    )

    prescriptions = sa.table(
        "workout_plan_exercises",
        sa.column("id", sa.Uuid()),
        sa.column("workout_plan_day_id", sa.Uuid()),
        sa.column("exercise_id", sa.Uuid()),
        sa.column("position", sa.Integer()),
        sa.column("target_sets", sa.Integer()),
        sa.column("target_to_failure", sa.Boolean()),
    )
    upper = exercise_rows[:8]
    lower = exercise_rows[8:]
    rows: list[dict[str, object]] = []
    row_number = 300
    for day_id, exercises_for_day in (
        ("00000000-0000-0000-0000-000000000101", upper),
        ("00000000-0000-0000-0000-000000000102", lower),
    ):
        for position, (exercise_id, _, _) in enumerate(exercises_for_day):
            row_number += 1
            rows.append(
                {
                    "id": f"00000000-0000-0000-0000-{row_number:012d}",
                    "workout_plan_day_id": day_id,
                    "exercise_id": exercise_id,
                    "position": position,
                    "target_sets": 2,
                    "target_to_failure": True,
                }
            )
    op.bulk_insert(prescriptions, rows)


def downgrade() -> None:
    """Drop plan-first gym workout tracking."""
    op.drop_table("workout_sets")
    op.drop_table("workout_sessions")
    op.drop_table("workout_plan_exercises")
    op.drop_table("workout_plan_days")
    op.drop_table("workout_plans")
    op.drop_table("exercises")
