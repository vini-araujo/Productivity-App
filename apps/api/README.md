# Discipline App API

This directory contains the FastAPI modular monolith.

Milestone 2 validates Supabase JWTs, persists application profiles with
SQLAlchemy, and manages schema changes with Alembic.

Future feature modules follow:

```text
router.py -> service.py -> repository.py -> PostgreSQL
```

Routers stay thin, services own business rules, and repositories own database
queries.

## Commands

```bash
uv sync --locked
uv run uvicorn app.main:app --reload --port 8000
uv run ruff check .
uv run ruff format --check .
uv run pytest
uv run alembic upgrade head
```

The API runs at `http://localhost:8000`. Its liveness and readiness endpoints
are `/health` and `/ready`. Authenticated profiles are available at
`/api/v1/me`.
