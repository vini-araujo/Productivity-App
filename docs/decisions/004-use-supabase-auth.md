# Use Supabase Auth

## Status

Accepted

## Context

The application needs secure signup, login, sessions, and JWTs without building
an identity system from scratch.

## Decision

Use Supabase Auth in the frontend and validate its asymmetric JWTs in FastAPI
through JWKS. Use `supabase-js` for authentication only; application data flows
through FastAPI. Scope every user-owned backend query by the authenticated
`user_id`.

## Consequences

Authentication delivery is faster and safer than a custom implementation. The
backend remains responsible for authorization, and service-role credentials
must never be exposed to the frontend. Direct Data API access is unavailable
unless a future decision intentionally introduces and secures it.
