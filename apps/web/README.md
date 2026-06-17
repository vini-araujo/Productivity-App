# Ordyn Life Web

This directory contains the mobile-first Next.js frontend.

Milestone 7 added a focused manual running log with calculated pace and
editable history. The dashboard shows the latest run alongside task, gym, and
journal status without duplicating the journal experience. Milestone 8 adds a
calendar page that surfaces existing user-owned tasks, workouts, runs, and
journal entries before backend deployment.

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
