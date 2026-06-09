# Discipline App API

This directory contains the FastAPI modular monolith skeleton.

Milestone 1 provides uv-managed dependencies, a runnable FastAPI application,
tested system endpoints, quality checks, and backend container support.

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
```

The API runs at `http://localhost:8000`. Its liveness and readiness endpoints
are `/health` and `/ready`.
