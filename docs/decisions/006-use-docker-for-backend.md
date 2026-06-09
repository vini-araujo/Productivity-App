# Use Docker for the Backend

## Status

Accepted

## Context

The FastAPI backend needs a consistent development and deployment artifact that
can run locally and on a managed AWS compute service.

## Decision

Package the backend as a Docker container beginning in Milestone 1 and deploy it
later to ECS/Fargate or Elastic Beanstalk.

## Consequences

Docker improves environment consistency and deployment portability. It adds
image maintenance and build concerns, which should remain modest for a single
backend service.
