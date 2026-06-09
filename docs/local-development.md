# Local Development

## Current Status

Milestone 1 contains runnable frontend and backend application skeletons.

## Prerequisites

- Git
- Node.js and npm
- Python 3.12
- uv
- GNU Make
- Docker Desktop with Docker Compose, for container commands only
- A Supabase project for hosted database/auth development, when required

The repository currently targets Node.js 24 LTS and Python 3.12. Docker Desktop
is optional for regular development and required only for container commands.

## Services

| Service | Address |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend | `http://localhost:8000` |
| Database | Supabase hosted PostgreSQL or optional local PostgreSQL |

## Environment Files

Copy values from the appropriate example files into ignored local environment
files when configuration overrides are needed:

- Root reference: `.env.example`
- Frontend reference: `apps/web/.env.example`
- Backend reference: `apps/api/.env.example`

Never commit secrets. The Supabase service-role key is optional, server-side
only, and should not be used unless a later feature requires it.

## Setup

```bash
make setup
```

Equivalent direct commands:

```bash
cd apps/web && npm ci
cd apps/api && uv sync --locked
```

## Development and Quality Commands

```bash
make dev
make test
make lint
make format-check
make build
```

Run one application directly with `make dev-web` or `make dev-api`. Run the API
container with `make docker-up`; stop it with `make docker-down`.

`make migrate` intentionally fails until Alembic is initialized with the first
persistence milestone.
