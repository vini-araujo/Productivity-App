# Local Development

## Current Status

Milestone 4 builds gym workout tracking on the runnable authentication,
protected profile, and user-owned task foundations.

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

Never commit secrets. The Supabase publishable key is intentionally public and
may be used by the frontend. The Supabase service-role key is optional,
server-side only, and is not required by Milestone 4.

For `apps/web/.env.local`, configure:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For `apps/api/.env`, configure `DATABASE_URL` from Supabase's connection panel
plus `SUPABASE_URL`. The conventional JWKS URL and issuer are derived from
`SUPABASE_URL`; explicit overrides remain available when needed.

```text
DATABASE_URL=your-supabase-postgresql-connection-string
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_JWT_AUDIENCE=authenticated
```

For local development on an IPv4-only network, Supabase's session-pooler
connection string is usually the easiest `DATABASE_URL`. Use the root `.env`
instead when passing the same backend values through Docker Compose.

Use a Supabase asymmetric signing key so FastAPI can validate access tokens
through JWKS. Do not put the database password or any secret key in the
frontend environment file.

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
make migrate
make migration-check
make dev
make test
make lint
make format-check
make build
```

Run one application directly with `make dev-web` or `make dev-api`. Run the API
container with `make docker-up`; stop it with `make docker-down`.

Run `make migrate` after configuring `apps/api/.env` to create or update the
Supabase schema. Run `make migration-check` to confirm that the configured live
database matches Alembic metadata. Tests and CI use fakes and an in-memory
database, so they do not require Supabase credentials.
