# Use Docker for the Backend

## Status

Accepted

## Context

The FastAPI backend needs a consistent development and deployment artifact that
can run locally and on a managed AWS compute service.

## Decision

Package the backend as a Docker container beginning in Milestone 1. The first
production hosting target is decided separately so the project can choose the
lowest-cost managed container option when deployment becomes current work.

## Consequences

Docker improves environment consistency and deployment portability. It adds
image maintenance and build concerns, which should remain modest for a single
backend service. See ADR 007 for the initial App Runner deployment choice.
