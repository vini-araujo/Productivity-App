# Discipline App Web

This directory contains the mobile-first Next.js frontend.

Milestone 5 adds a focused daily journal with an autosaving Today editor and
searchable History. Previous entries can be reopened, edited, and deleted.
The existing task and gym workflows remain available alongside it.

The planned deployment target is a static export hosted on AWS S3 behind
CloudFront. Avoid introducing Next.js server-only runtime requirements without
revisiting that deployment decision.

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
