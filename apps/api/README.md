# Discipline App API

This directory contains the FastAPI modular monolith.

Milestone 4 adds plan-first gym workout logging to the authenticated task and
profile foundation.

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
uv run alembic check
```

The API runs at `http://localhost:8000`. Its liveness and readiness endpoints
are `/health` and `/ready`. Authenticated profiles are available at
`/api/v1/me`, and authenticated task CRUD is available at `/api/v1/tasks`.
Workout plans, sessions, and sets are available under `/api/v1/workouts`.
