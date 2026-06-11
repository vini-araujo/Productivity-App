"""Alembic migration environment."""

from logging.config import fileConfig
from typing import Any

from sqlalchemy import (
    Column,
    ForeignKeyConstraint,
    MetaData,
    Table,
    Uuid,
    engine_from_config,
    pool,
)

from alembic import context
from app.core.config import settings
from app.core.database import Base, normalize_database_url
from app.modules.tasks import models as tasks_models  # noqa: F401
from app.modules.users import models as users_models  # noqa: F401
from app.modules.workouts import models as workouts_models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = MetaData()
for table in Base.metadata.sorted_tables:
    table.to_metadata(target_metadata)

Table("users", target_metadata, Column("id", Uuid, primary_key=True), schema="auth")

for table_name, constraint_name in (
    ("profiles", "fk_profiles_user_id_auth_users"),
    ("tasks", "fk_tasks_user_id_auth_users"),
    ("exercises", "fk_exercises_user_id_auth_users"),
    ("workout_plans", "fk_workout_plans_user_id_auth_users"),
    ("workout_sessions", "fk_workout_sessions_user_id_auth_users"),
):
    target_metadata.tables[table_name].append_constraint(
        ForeignKeyConstraint(
            ["user_id"],
            ["auth.users.id"],
            name=constraint_name,
            ondelete="CASCADE",
        )
    )


def include_object(
    object_: Any,
    name: str | None,
    type_: str,
    reflected: bool,
    compare_to: Any,
) -> bool:
    """Exclude the externally managed Supabase Auth table itself."""
    del name, type_, reflected, compare_to
    return getattr(object_, "schema", None) != "auth"


def get_database_url() -> str:
    """Return the configured SQLAlchemy-compatible migration URL."""
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL must be configured before running migrations")
    return normalize_database_url(settings.database_url)


def run_migrations_offline() -> None:
    """Run migrations without creating a live database connection."""
    context.configure(
        url=get_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations with a live database connection."""
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_database_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
