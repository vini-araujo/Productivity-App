# Use FastAPI for the Backend

## Status

Accepted

## Context

The backend needs typed HTTP APIs, authentication dependencies, validation, and
automatic API documentation with a productive Python development experience.

## Decision

Use FastAPI with Pydantic schemas and explicit router, service, and repository
layers.

## Consequences

FastAPI provides strong API ergonomics and type-driven documentation. The team
must keep route handlers thin and avoid allowing framework concerns to spread
into business logic.
