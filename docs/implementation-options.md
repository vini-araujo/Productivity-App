# Useful Implementation Options

## Status

Planning. These options are intentionally scoped as possible next milestones or
small milestone slices. They do not change the current Milestone 7 behavior and
do not introduce cloud resources, secrets, AI features, or integrations.

## Selection Criteria

Useful near-term work should:

- Make the existing app more valuable in daily use.
- Strengthen the portfolio story with realistic full-stack engineering.
- Fit the modular monolith and existing feature-folder structure.
- Preserve backend-owned authorization and user scoping.
- Avoid expensive infrastructure or premature product complexity.

## Recommended Order

| Rank | Option | Main value | Effort | Risk |
| ---: | --- | --- | --- | --- |
| 1 | Notes | Completes a core planned productivity surface | Medium | Low |
| 2 | Task due dates and dashboard focus | Makes task management more useful day to day | Small | Low |
| 3 | Journal tags and mood | Adds reflection/search value without rich text complexity | Medium | Low |
| 4 | Workout history polish | Improves the gym workflow already in place | Medium | Medium |
| 5 | Running dashboard trends | Adds useful insight without GPS or integrations | Medium | Medium |
| 6 | Frontend deployment | Makes the project publicly demoable | Medium | Medium |
| 7 | Backend deployment | Completes production architecture for the API | Medium | Medium |

## Option 1: Notes

### Why It Is Useful

Notes are already in the roadmap and round out the productivity core alongside
tasks and journaling. A simple notes feature gives users a place for ideas,
references, and reusable information that does not belong to a daily journal
entry or task.

### Minimal Scope

- `notes` table with `id`, `user_id`, `title`, `content`, timestamps, and
  optional `archived_at`.
- Protected REST routes under `/api/v1/notes`.
- List, create, read, update, archive/unarchive, and delete operations.
- Frontend notes page with searchable list and editor.
- Dashboard can optionally show a small recent-notes section after the core
  feature is stable.

### Avoid For V1

- Rich text editing.
- Attachments.
- Public sharing.
- AI summarization.
- Complex tag graph or backlinks.

### Engineering Notes

Follow the existing module pattern:

```text
apps/api/app/modules/notes/
  router.py
  schemas.py
  models.py
  service.py
  repository.py
  tests/
```

Frontend shape:

```text
apps/web/src/features/notes/
  api.ts
  types.ts
  components/
```

### Definition Of Done

- Authenticated users can create, search, edit, archive, and delete only their
  own notes.
- Missing or invalid tokens are rejected.
- Cross-user reads and mutations are impossible.
- Alembic migration applies cleanly.
- API tests cover ownership and validation.
- Frontend lint, typecheck, formatting, and build pass.

## Option 2: Task Due Dates And Dashboard Focus

### Why It Is Useful

Tasks exist, but the daily usefulness improves when the app clearly separates
overdue, due today, upcoming, and unscheduled work. This is a small slice with
strong user value.

### Minimal Scope

- Add task filters for overdue, today, upcoming, and no due date.
- Add dashboard sections for overdue count and today's next tasks.
- Add quick due-date controls in the task UI.
- Preserve existing pagination and completion filtering.

### Avoid For V1

- Recurring tasks.
- Reminders or notifications.
- Calendar sync.
- Complex priority scoring.

### Definition Of Done

- Dashboard makes today's task pressure obvious.
- Task list can filter by due-date bucket.
- Date handling is based on a browser-supplied local date and never affects
  ownership.
- Existing task CRUD behavior remains compatible.

## Option 3: Journal Tags And Mood

### Why It Is Useful

The journal already supports private daily entries. Tags and a simple mood value
make history more useful without taking on the complexity of rich text or
analytics.

### Minimal Scope

- Add optional `mood` field to journal entries.
- Add simple tags as either a text array or normalized user-owned tag table.
- Add filters for mood and tag in journal history.
- Show mood/tag context in dashboard journal status only after API behavior is
  stable.

### Avoid For V1

- Sentiment analysis.
- AI-generated summaries.
- Rich text.
- Public or shared entries.

### Definition Of Done

- Users can add, edit, and filter private journal metadata.
- Tags and mood cannot be used to access another user's entries.
- Migration and API tests cover metadata validation.
- UI remains fast and mobile-friendly.

## Option 4: Workout History Polish

### Why It Is Useful

The gym workflow has meaningful data already. Improving history and editing
makes it more trustworthy without adding advanced analytics.

### Minimal Scope

- Better session history filters.
- Session detail view with completed sets grouped by exercise.
- Safer edit/delete flows for completed sessions.
- Dashboard copy that distinguishes active, skipped, and completed training.

### Avoid For V1

- Progress charts.
- Personal record automation.
- Timers.
- Plate calculators.
- Program generation or coaching.

### Definition Of Done

- A user can review recent training clearly on mobile.
- Completed sessions remain historically understandable.
- Shared built-in exercises remain read-only.
- All session and set operations remain scoped by JWT subject.

## Option 5: Running Dashboard Trends

### Why It Is Useful

Running logs are implemented. Light trend summaries make the data feel alive
without adding GPS, Strava, maps, or training plans.

### Minimal Scope

- Weekly distance total.
- Recent run count.
- Average pace over the latest small window.
- Dashboard running card with latest run plus weekly summary.

### Avoid For V1

- Personal record automation.
- GPS routes or maps.
- Strava integration.
- Training plans.
- Coaching or advanced analytics.

### Definition Of Done

- Aggregates are computed from authenticated user's runs only.
- Empty states are clear for new users.
- Calculations are simple, documented, and tested.
- Dashboard stays read-only and performs no cross-feature mutations.

## Option 6: Frontend Deployment

### Why It Is Useful

Static frontend deployment makes the project demoable and validates the chosen
S3, CloudFront, and Cloudflare architecture.

### Minimal Scope

- Build static export through the existing Next.js config.
- Create documented AWS resources or infrastructure as code.
- Configure production public environment values.
- Manual GitHub Actions deploy workflow using OIDC.
- Smoke test deployed login and dashboard entry points.

### Avoid For V1

- Server-side Next.js features.
- Real deployment secrets in source control.
- Multi-environment promotion logic.

### Definition Of Done

- `ordynlife.com` serves the static frontend over HTTPS.
- Frontend points to the chosen API base URL.
- Supabase Auth redirects work from production and local development.
- Deployment remains manual and observable.

## Option 7: Backend Deployment

### Why It Is Useful

Deploying the API completes the production architecture and makes the app usable
outside local development.

### Minimal Scope

- Use the App Runner plan in `docs/backend-deployment-plan.md`.
- Push the Docker image to ECR.
- Configure production runtime environment outside source control.
- Run Alembic migrations explicitly.
- Smoke test `/health`, `/ready`, auth failures, CORS, and one authenticated
  workflow.

### Avoid For V1

- ECS/Fargate unless App Runner is insufficient.
- Long-lived AWS access keys.
- Automatic migrations on API startup.
- Extra services or queues.

### Definition Of Done

- `api.ordynlife.com` serves the FastAPI backend over HTTPS.
- `/ready` catches missing config and database failures.
- Protected endpoints reject missing and invalid tokens.
- CORS allows only deployed frontend origins and local development as needed.
- AWS budget alerts and log retention are configured.

## Smaller Quality Improvements

These are good filler tasks between larger milestones:

- Add a shared frontend API error helper to reduce duplicate error parsing.
- Add frontend route guards that redirect unauthenticated users consistently.
- Add consistent empty/loading/error states across dashboard, tasks, gym,
  journal, and running pages.
- Add README screenshots or short demo flows once deployment exists.
- Add a security checklist covering CORS, JWT validation, ownership scoping,
  RLS defense in depth, and secret handling.
- Add seed/demo data commands for local development only.

## Not Recommended Yet

These ideas may be useful later but are not good next steps:

- AI planning, coaching, or summarization.
- Strava or calendar integrations.
- Push notifications and reminders.
- GPS route maps.
- Advanced workout or running analytics.
- Team, sharing, or social features.
- Microservices or async worker architecture.

## Suggested Next Step

Implement **Notes** next. It is already in the roadmap, exercises the full
backend module pattern again, improves day-to-day usefulness, and stays safely
inside the V1 product boundary.
