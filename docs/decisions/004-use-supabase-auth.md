# Use Supabase Auth

## Status

Accepted

## Context

The application needs secure signup, login, sessions, and JWTs without building
an identity system from scratch.

## Decision

Use Supabase Auth in the frontend and validate its JWTs in FastAPI, preferably
through JWKS. Scope every user-owned backend query by the authenticated
`user_id`.

## Consequences

Authentication delivery is faster and safer than a custom implementation. The
backend remains responsible for authorization, and service-role credentials
must never be exposed to the frontend.
