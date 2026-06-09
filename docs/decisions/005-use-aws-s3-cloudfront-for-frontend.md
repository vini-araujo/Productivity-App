# Use AWS S3 and CloudFront for the Frontend

## Status

Accepted

## Context

The project should provide practical AWS deployment experience while keeping
frontend hosting inexpensive and operationally simple.

## Decision

Design the Next.js frontend for static export and host it in AWS S3 behind
CloudFront, with Cloudflare managing DNS.

## Consequences

The frontend gains low-cost global delivery and useful AWS experience. Static
hosting constrains server-only Next.js features; changing that constraint
requires revisiting this decision.
