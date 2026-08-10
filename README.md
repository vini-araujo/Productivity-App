# Ordyn Life

Ordyn Life is a planned productivity, routine, fitness, and self-improvement
platform. It will bring tasks, journaling, gym tracking, running, and personal
progress into one mobile-first application.

This repository is a portfolio-quality full-stack project built incrementally.
Each milestone should produce a small, tested, documented, and reviewable
improvement.

The local workspace directory remains `Productivity App/`.

## Current Status

**Milestone 8: Calendar**

Milestone 3 completed the first product workflow: authenticated users can
manage their own tasks through the protected FastAPI API. Milestone 4 added
plan-first gym logging, and Milestone 5 added a private daily journal.
Milestone 6 added one protected daily overview across tasks, training, and
journaling. Milestone 7 added private manual run logging and history.
Milestone 8 added a protected, read-only calendar view across existing
tasks, workouts, runs, and journal entries before backend deployment.

## Architecture

Ordyn Life uses a modular monolith:

- One Next.js frontend organized by feature.
- One FastAPI backend divided into internal feature modules.
- A layered backend request flow: router, service, repository, PostgreSQL.
- Supabase PostgreSQL and Supabase Auth.
- User-owned data is always scoped by the authenticated `user_id`.

This keeps local development and deployment manageable for one developer while
preserving clear module boundaries. See [docs/architecture.md](docs/architecture.md).

## Planned Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js, TypeScript, Tailwind CSS, npm |
| Backend | Python 3.12, FastAPI, uv, SQLAlchemy |
| Database | Supabase PostgreSQL, Alembic migrations |
| Authentication | Supabase Auth with backend JWT validation |
| Local infrastructure | Docker Compose |
| CI/CD | GitHub Actions |
| Frontend deployment | AWS S3, CloudFront, Cloudflare |
| Backend deployment | Docker on AWS App Runner |

S3 will host only the statically exported frontend. The FastAPI backend must run
in a container-capable service.

## Repository Layout

```text
apps/web/          Runnable Next.js frontend shell
apps/api/          Runnable FastAPI modular monolith skeleton
docs/              Architecture and development documentation
docs/decisions/    Architecture Decision Records
infra/             Future infrastructure documentation
.github/workflows/ Active quality CI and deployment placeholders
```

## Development Milestones

| Milestone | Goal |
| --- | --- |
| 0 | Repository foundation and planning |
| 1 | Runnable frontend and backend skeletons |
| 2 | Supabase Auth and protected profile endpoint |
| 3 | Tasks CRUD |
| 4 | Gym workout tracking |
| 5 | Journal |
| 6 | Dashboard aggregation |
| 7 | Running |
| 8 | Calendar aggregation |
| 9 | Containerized backend deployment |
| 10 | Notes |
| 11 | Future integrations |

## Local Development

Development uses npm for the frontend and uv for the backend. Install Node.js
24 LTS, Python 3.12, uv, and optionally Docker Desktop.

```bash
make setup
make dev
```

The local endpoints are:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- API documentation: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

See [docs/local-development.md](docs/local-development.md) for the current setup
contract and planned commands.

For possible next product and engineering slices, see
[docs/implementation-options.md](docs/implementation-options.md).

## Current Product Boundary

Implemented now:

- Supabase Auth signup, login, logout, and browser sessions
- Asymmetric Supabase JWT validation in FastAPI
- Protected `GET /api/v1/me` and `PATCH /api/v1/me`
- SQLAlchemy profile persistence and Alembic migration
- English and Brazilian Portuguese profile-language preference
- Protected task CRUD with pagination and completion filtering
- Mobile-first task creation, editing, completion, and deletion
- Shared U/L/Rest starter split and user-owned workout plans
- Generated workout sessions with weight, repetitions, and failure tracking
- Private daily journal entries with optional titles
- Autosaving Today editor and searchable, editable journal history
- Protected dashboard snapshot across existing user-owned features
- Mobile-first overview of next tasks, workout status, and today's journal
- Private manual run logging with editable and deletable history
- Automatically calculated running pace and latest-run dashboard status
- Static frontend export configuration for AWS S3 and CloudFront with
  Cloudflare DNS
- A protected calendar page and API that aggregate existing user-owned tasks,
  workouts, runs, and journal entries
- Links from calendar items back to the owning feature pages

Advanced workout analytics, coaching, timers, recurring tasks, reminders,
streaks, scoring, charts, GPS routes, Strava integration, running plans, mood
tracking, journal tags, rich text, translated UI copy, backend deployment,
deployment automation, and secrets remain intentionally unimplemented.
