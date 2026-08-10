# Ordyn Life Web

This directory contains the mobile-first Next.js frontend.

Milestone 8 added a calendar page that surfaces existing user-owned tasks,
workouts, runs, and journal entries on top of the task, gym, journal,
dashboard, and running foundations before backend deployment.

The deployment target is a static export hosted on AWS S3 behind CloudFront.
Avoid introducing Next.js server-only runtime requirements without revisiting
that deployment decision.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run format:check
npm run build
```

The application runs at `http://localhost:3000`. The production export is
written to `out/`.

`package.json` temporarily overrides PostCSS to a patched compatible release
because the current stable Next.js package resolves an older vulnerable
transitive version.
