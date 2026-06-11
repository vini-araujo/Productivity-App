# Discipline App Web

This directory contains the mobile-first Next.js frontend.

Milestone 4 adds a focused mobile-first gym workflow for selecting a starter
workout, entering weight and repetitions, and completing the session alongside
the protected task experience. Completed sessions can be reviewed from the Gym
history view, and users can cancel active sessions or delete completed ones.
Users can also create a personalized split from the focused Gym screen using
the shared exercise catalog.

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
