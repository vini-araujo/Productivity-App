# Discipline App Web

This directory contains the mobile-first Next.js frontend shell.

Milestone 1 provides Next.js, TypeScript, Tailwind CSS, linting, formatting,
typechecking, and a static production build.

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
