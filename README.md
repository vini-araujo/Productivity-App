# Productivity App

Productivity App is a planned productivity, routine, fitness, and
self-improvement platform. It will bring tasks, journaling, gym tracking, and
personal progress into one mobile-first application.

This repository is a portfolio-quality full-stack project built incrementally.
Each milestone should produce a small, tested, documented, and reviewable
improvement.

## Current Status

**Milestone 3: User-Owned Tasks CRUD**

The repository now contains the first complete product workflow: authenticated
users can create, edit, prioritize, schedule, complete, filter, and delete
their own tasks through the protected FastAPI API.

## Architecture

Productivity App uses a modular monolith:

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
| Backend deployment | Docker on AWS ECS/Fargate or Elastic Beanstalk |

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
| 7 | Static frontend deployment |
| 8 | Containerized backend deployment |
| 9 | Notes and running |
| 10 | Future integrations |

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

## Milestone 3 Boundary

Implemented now:

- Supabase Auth signup, login, logout, and browser sessions
- Asymmetric Supabase JWT validation in FastAPI
- Protected `GET /api/v1/me` and `PATCH /api/v1/me`
- SQLAlchemy profile persistence and Alembic migration
- English and Brazilian Portuguese profile-language preference
- Protected task CRUD with pagination and completion filtering
- Mobile-first task creation, editing, completion, and deletion

Recurring tasks, reminders, labels, subtasks, translated UI copy, real cloud
resources, deployment automation, and secrets remain intentionally
unimplemented.
