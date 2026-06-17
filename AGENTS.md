# Discipline App - Agent Instructions

This repository contains **Discipline App**, a production-style productivity,
routine, fitness, and self-improvement web application.

The app is being built incrementally as a portfolio-quality full-stack project.
The goal is to demonstrate real-world engineering practices without
overengineering the first version.

This file defines persistent instructions for coding agents working in this
repository.

## 1. Project Identity

- Application name: **Discipline App**
- Existing local workspace directory name: **Productivity App**
- Do not rename the local workspace directory unless explicitly asked.
- The current milestone is **Milestone 8: Calendar**.
- Milestone 8 establishes a protected, read-only calendar view over existing
  tasks, gym workouts, runs, and journal entries before backend deployment.

The planned product includes tasks, journaling, notes, gym and running workout
tracking, a dashboard, calendar, and future Strava and possible AI
integrations.

## 2. Architecture Decision

Use a **modular monolith**.

Do not use microservices, Kubernetes, Kafka, RabbitMQ, complex event-driven
architecture, full hexagonal architecture, premature domain-driven design
abstractions, or LLM/AI features in V1.

The backend will eventually be one FastAPI application with internal modules:

```text
HTTP request
  -> router.py
  -> service.py
  -> repository.py
  -> PostgreSQL
```

Each future backend module should contain:

```text
router.py       # HTTP routes and request/response handling
schemas.py      # Pydantic request/response models
models.py       # SQLAlchemy/SQLModel database models
service.py      # business logic
repository.py   # database queries
tests/          # module-specific tests
```

Keep routers thin. Put business rules in services. Put persistence logic in
repositories.

## 3. Technology Choices

Standardize future development on:

- Frontend: Next.js, TypeScript, Tailwind CSS, mobile-first design, npm
- Backend: Python 3.12, FastAPI, uv, SQLAlchemy or SQLModel, Alembic, Docker
- Database/Auth: Supabase PostgreSQL and Supabase Auth
- Authentication: prefer Supabase JWT validation through JWKS
- Infrastructure: GitHub Actions, AWS S3 and CloudFront for the static
  frontend, Cloudflare for DNS, and ECS/Fargate or Elastic Beanstalk later for
  the containerized backend

The Supabase service-role key is optional and must not be required by default.
S3 can host the static frontend only. S3 cannot host the FastAPI backend.

## 4. Current Milestone Rules

Milestone 8 may create:

- A protected read-only calendar aggregation endpoint
- A calendar module router, service, repository, schemas, and tests
- A mobile-first calendar page with month/list navigation
- Normalized calendar item responses for tasks, workouts, runs, and journal
  entries
- Links from calendar items back to their owning feature workflows
- Date-range validation and ownership tests

Milestone 8 must not create:

- Google Calendar integration, external OAuth, calendar sync, recurring events,
  reminders, notifications, drag-and-drop scheduling, or event invitations
- A separate persisted calendar events table or independent calendar CRUD
- Mutations that bypass the owning task, workout, running, or journal modules
- Notes, backend deployment, or integrations behavior
- Direct frontend database access through the Supabase Data API
- Supabase service-role key dependencies
- Real deployment resources, secrets, tokens, or populated environment values

## 5. Repository Structure Contract

Maintain this planned structure:

```text
Productivity App/
|-- AGENTS.md
|-- apps/
|   |-- web/
|   |   |-- src/
|   |   |   |-- app/
|   |   |   |-- components/{ui,layout,forms,charts,navigation}/
|   |   |   |-- features/{calendar,dashboard,tasks,workouts,journal,notes,running}/
|   |   |   |-- hooks/
|   |   |   |-- lib/
|   |   |   |-- types/
|   |   |   `-- styles/
|   |   |-- public/
|   |   |-- .env.example
|   |   `-- README.md
|   `-- api/
|       |-- app/
|       |   |-- main.py
|       |   |-- core/
|       |   |-- shared/
|       |   `-- modules/{users,tasks,workouts,journal,notes,running,calendar,integrations}/
|       |-- alembic/
|       |-- .env.example
|       `-- README.md
|-- docs/
|   |-- architecture.md
|   |-- api-design.md
|   |-- database-schema.md
|   |-- deployment.md
|   |-- local-development.md
|   `-- decisions/
|       |-- 001-use-modular-monolith.md
|       |-- 002-use-fastapi.md
|       |-- 003-use-supabase-postgres.md
|       |-- 004-use-supabase-auth.md
|       |-- 005-use-aws-s3-cloudfront-for-frontend.md
|       `-- 006-use-docker-for-backend.md
|-- infra/{aws,cloudflare,diagrams}/
|-- .github/workflows/{web-ci.yml,api-ci.yml,deploy-web.yml,deploy-api.yml}
|-- .env.example
|-- .gitignore
|-- docker-compose.yml
|-- Makefile
`-- README.md
```

Do not create a nested `discipline-app/` directory. Initialize Git at the
current workspace root if needed. Do not create a commit unless explicitly
asked.

## 6. Documentation Standards

Documentation should be concise, professional, useful, and honest about what is
implemented versus planned. Use Mermaid diagrams when helpful.

The root README should explain the product vision, current milestone,
architecture, technology stack, Deployment Option A, local development plan,
roadmap, and intentionally unimplemented work.

Required documentation:

- `docs/architecture.md`
- `docs/api-design.md`
- `docs/database-schema.md`
- `docs/deployment.md`
- `docs/local-development.md`

## 7. ADR Standards

Architecture Decision Records live in `docs/decisions/` and use this format:

```markdown
# ADR Title

## Status

Accepted

## Context

Explain the problem or decision.

## Decision

Explain the chosen approach.

## Consequences

Explain tradeoffs, benefits, and costs.
```

Keep ADRs concise and focused on real engineering tradeoffs.

## 8. API Design Guardrails

- Planned API prefix: `/api/v1`
- Planned system endpoints: `GET /health` and `GET /ready`
- Planned user endpoints: `GET /api/v1/me` and `PATCH /api/v1/me`
- Future feature endpoints follow REST-style conventions.
- All user-owned resources must be scoped by authenticated `user_id`.
- Never trust the frontend to determine ownership.
- Supabase service-role keys must never be exposed in frontend code.

Expected auth flow:

```text
Supabase Auth login
  -> frontend receives session/JWT
  -> frontend sends Authorization: Bearer <token>
  -> FastAPI validates JWT and extracts user_id
  -> backend queries are scoped by user_id
```

## 9. Database Guardrails

- Use PostgreSQL with Supabase as the production provider.
- Use Alembic for all application schema migrations.
- Milestone 8 adds no new persistence tables; it reads existing user-owned
  task, workout, run, and journal data through backend-scoped queries.
- Every user-owned table must include `user_id`.
- Exercise catalog rows use nullable `user_id`: null identifies a shared
  built-in exercise, while a populated value identifies a user-owned custom
  exercise.
- Built-in exercises must never be mutated through user-facing APIs. Custom
  exercise queries and mutations must be scoped by authenticated `user_id`.
- Planned tables include profiles, tasks, journal entries, notes, exercises,
  workout sessions and sets, run sessions, and integration accounts.
- Calendar views should aggregate existing tables unless a future milestone
  explicitly introduces standalone event behavior.
- Implement tables incrementally rather than all at once.

## 10. Frontend Guardrails

Organize frontend code by feature. Future feature folders should contain
`api.ts`, `types.ts`, `hooks.ts`, `components/`, and `utils.ts` as needed.

The UI should be mobile-first:

- Desktop: sidebar navigation and main content
- Mobile: bottom navigation and full-width pages
- Suggested mobile navigation: Dashboard, Tasks, Calendar, Gym, More

Avoid placing business logic directly inside page components.

## 11. Environment Variable Rules

Never add real secrets. Only create `.env.example` files with empty or clearly
example values.

Planned frontend variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
```

Planned backend variables:

```text
DATABASE_URL=
SUPABASE_URL=
SUPABASE_JWKS_URL=
SUPABASE_JWT_ISSUER=
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_SERVICE_ROLE_KEY=
CORS_ALLOWED_ORIGINS=
ENVIRONMENT=local
```

Planned future AWS variables:

```text
AWS_REGION=
AWS_S3_FRONTEND_BUCKET=
AWS_CLOUDFRONT_DISTRIBUTION_ID=
AWS_S3_FILES_BUCKET=
```

The service-role key is optional and server-side only.

## 12. CI/CD Guardrails

Frontend and backend CI workflows run on pull requests, pushes to
`main`, and manual dispatch. They require no secrets and perform no deployment.
Deployment workflows remain manual-only placeholders.

Do not assume AWS credentials exist or add real cloud resource names.

## 13. Docker Guardrails

The backend must have a production-style Dockerfile and be runnable through
Docker Compose. Do not add database or frontend containers before they solve a
current milestone need. Do not report Docker verification success when Docker
is unavailable.

## 14. Makefile Guardrails

The Makefile should be self-documenting. Commands for development, test, lint,
format, build, migrations, and backend Docker builds should work.

## 15. Verification Requirements

For Milestone 8:

1. Run frontend lint, typecheck, formatting check, and static production build.
2. Run backend Ruff checks, formatting check, pytest, and migration checks.
3. Confirm protected endpoints reject missing or invalid bearer tokens.
4. Confirm every calendar aggregate scopes ownership by validated JWT subject
   and never accepts frontend-supplied ownership.
5. Search repository files for accidental credentials or populated secrets.
6. Build and health-check the backend container when Docker is available.
7. Verify the local calendar workflow against real Supabase data only after
   ignored environment files are configured.

## 16. Incremental Development Rule

For every milestone:

1. State what will change.
2. Make the smallest coherent implementation.
3. Add or update tests where appropriate.
4. Run available verification.
5. Update documentation when architecture or workflow changes.
6. Summarize the changes.
7. Recommend the next small step.

Do not jump ahead or implement future features unless explicitly asked.

## 17. Milestone Roadmap

- Milestone 0: planning, documentation, file structure, repository foundation
- Milestone 1: runnable Next.js and FastAPI skeletons, dependencies, local
  commands, and health endpoints
- Milestone 2: Supabase Auth and protected `/api/v1/me`
- Milestone 3: tasks CRUD
- Milestone 4: gym workout tracking
- Milestone 5: journal
- Milestone 6: dashboard aggregation
- Milestone 7: running
- Milestone 8: calendar aggregation
- Milestone 9: backend container deployment
- Milestone 10: notes
- Milestone 11: future integrations

## 18. Agent Behavior Rules

Before editing:

- Inspect and preserve existing work.
- Do not create a nested project directory.
- Do not install dependencies unless the milestone requires it.
- Do not introduce secrets or make commits unless explicitly asked.

When editing:

- Prefer small, clear changes and explicit names.
- Avoid unnecessary abstractions and fake implementation.
- Keep documentation honest about implemented versus planned behavior.

After editing:

- Summarize files changed and verification performed.
- Mention anything that could not be verified.
- Recommend the next small milestone.

## 19. Definition of Done for Milestone 8

Milestone 8 is complete when authenticated users can view a calendar range that
combines only their own task due dates, workout sessions, run sessions, and
journal entries, with clear links back to each source workflow. The feature
must use backend JWT ownership, tests and CI checks must pass, and documentation
must match the implemented workflow.

Milestone 8 is not complete if ownership can be supplied by the frontend,
cross-user access is possible, secrets are committed, standalone event CRUD is
added, or external calendar integrations, reminders, recurrence, or scheduling
automation are introduced.
