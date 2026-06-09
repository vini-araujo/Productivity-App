# Use a Modular Monolith

## Status

Accepted

## Context

Discipline App contains several product areas but is developed and operated by
one developer. Independent services would add deployment, networking, and data
consistency overhead before those costs solve a real problem.

## Decision

Build one FastAPI backend with clearly separated internal feature modules and
one Next.js frontend organized by feature.

## Consequences

Development and deployment remain simple, while module boundaries preserve a
path to future separation if justified. The codebase must actively prevent
cross-module coupling from eroding those boundaries.
