# Use AWS App Runner for the Backend

## Status

Accepted

## Context

The backend needs a container-capable production host for `api.ordynlife.com`.
The project should minimize monthly cost and operational overhead while still
using the existing Dockerized FastAPI application.

## Decision

Deploy the backend to AWS App Runner first. Use the existing Docker image,
publish it through ECR, configure `api.ordynlife.com` as a custom domain, and
keep Supabase as the managed PostgreSQL and Auth provider.

## Consequences

App Runner removes the need to manage an Application Load Balancer, ECS service,
target groups, and most VPC networking for the first deployment. This should be
cheaper and simpler for low portfolio traffic. It provides less infrastructure
depth than ECS/Fargate and may be revisited later if the app needs private VPC
networking, finer scaling controls, or more advanced container orchestration.
