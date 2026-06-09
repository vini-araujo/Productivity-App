# Use Supabase PostgreSQL

## Status

Accepted

## Context

The application needs a relational database without requiring a solo developer
to operate production database infrastructure.

## Decision

Use Supabase-hosted PostgreSQL in production and Alembic as the application
schema migration source of truth.

## Consequences

The project gains managed PostgreSQL and straightforward integration with
Supabase Auth. It accepts provider dependency and must keep migrations portable
enough to preserve a future move to standard PostgreSQL.
