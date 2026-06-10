# Database Schema

## Status

The production database is Supabase PostgreSQL. Milestone 2 introduces Alembic
as the schema source of truth and creates the first user-owned table.

Alembic will be the source of truth for schema changes beginning when the first
persisted feature is implemented.

## Ownership Rule

Every user-owned table includes `user_id`. Backend queries must filter by the
authenticated user identifier, including reads, updates, and deletes.

## Planned Tables

| Table | Purpose | Planned milestone |
| --- | --- | --- |
| `profiles` | Application profile linked to Supabase Auth (implemented) | 2 |
| `tasks` | User task management | 3 |
| `exercises` | Shared and user-created exercise catalog | 4 |
| `workout_sessions` | Gym workout sessions | 4 |
| `workout_sets` | Sets recorded within sessions | 4 |
| `journal_entries` | Dated journal entries | 5 |
| `notes` | General notes and tags | 9 |
| `run_sessions` | Running activity records | 9 |
| `integration_accounts` | Future provider connections | 10 |

## Planned Relationships

```mermaid
erDiagram
    PROFILES ||--o{ TASKS : owns
    PROFILES ||--o{ JOURNAL_ENTRIES : owns
    PROFILES ||--o{ WORKOUT_SESSIONS : owns
    WORKOUT_SESSIONS ||--o{ WORKOUT_SETS : contains
    EXERCISES ||--o{ WORKOUT_SETS : records
    PROFILES ||--o{ NOTES : owns
    PROFILES ||--o{ RUN_SESSIONS : owns
    PROFILES ||--o{ INTEGRATION_ACCOUNTS : connects
```

Detailed columns, constraints, indexes, delete behavior, and migration strategy
will be finalized with each feature. This avoids committing to unused schema
before its behavior is implemented and tested.

## Profiles

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user_id` | UUID | Unique foreign key to `auth.users.id` |
| `display_name` | varchar(80) | Optional |
| `timezone` | varchar(64) | Defaults to `UTC` |
| `locale` | varchar(10) | `en-US` or `pt-BR` at the API boundary |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last application update timestamp |

The migration enables Row Level Security on `profiles`. No Data API policies
are added because application data is accessed through FastAPI.
