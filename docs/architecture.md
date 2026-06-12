# Architecture

## Current State

Milestone 6 adds a read-only dashboard aggregation module through the existing
authenticated modular-monolith boundary.

## System Context

```mermaid
flowchart LR
    User[User] --> Web[Next.js static frontend]
    Web --> Auth[Supabase Auth]
    Web --> API[FastAPI modular monolith]
    API --> JWKS[Supabase JWKS]
    API --> DB[(Supabase PostgreSQL)]
    Web -. future uploads .-> Files[AWS S3 files bucket]
```

## Modular Monolith

The backend is one deployable FastAPI application with modules for users,
tasks, workouts, journal, notes, running, and integrations. A modular monolith
keeps deployment and operations simple while providing clear ownership
boundaries inside the codebase.

Each active module will use:

```text
HTTP request
  -> router.py
  -> service.py
  -> repository.py
  -> PostgreSQL
```

- Routers handle HTTP concerns and dependencies.
- Schemas validate API requests and responses.
- Services enforce ownership and business rules.
- Repositories contain database queries.
- Models describe persisted data.

Modules may share narrowly scoped infrastructure from `app/core` and reusable
application utilities from `app/shared`. Modules should not bypass service
boundaries to manipulate another module's persistence directly.

The dashboard is the intentional read-only aggregation boundary. Its repository
queries existing user-owned feature tables, while mutations remain inside
their owning task, workout, and journal modules.

## Frontend Organization

The frontend will use Next.js App Router pages for routing and feature folders
for domain-specific API calls, types, hooks, components, and utilities.
Cross-feature UI belongs in `src/components`.

The interface will be mobile-first, with bottom navigation on mobile and a
sidebar on desktop.

## Security Boundary

Supabase Auth issues the user JWT. The frontend sends the JWT to FastAPI in the
`Authorization` header. FastAPI validates the token, extracts `user_id`, and
scopes every user-owned query to that identifier.

The backend never trusts resource ownership supplied by the frontend.

The frontend uses `supabase-js` for authentication only. Application data flows
through FastAPI rather than the Supabase Data API. The backend does not require
a Supabase service-role key.

## Deployment Shape

The frontend is planned as a static Next.js export hosted in S3 behind
CloudFront and Cloudflare. The backend is a Dockerized FastAPI service deployed
later to ECS/Fargate or Elastic Beanstalk. Supabase provides hosted PostgreSQL
and authentication.
