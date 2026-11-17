# Tasklist 2

Personal task and project workspace built with Next.js App Router, React, Better Auth, and PostgreSQL (`pg`).

## Getting Started

1. Copy `.env.example` to `.env.local` and configure `DATABASE_URL`, `BETTER_AUTH_URL`, and `BETTER_AUTH_SECRET`.
2. Apply the SQL migrations in `db/migrations/` in order (`0001_initial.sql`, `0002_remove_in_progress.sql`, `0003_split_task_positions.sql`); see [`db/README.md`](db/README.md).
3. Verify database connectivity and schema columns, then start the development server:

```bash
npm run db:check
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (unauthenticated requests redirect to `/sign-in`).

## Scripts

- `npm run dev` — start the Next.js development server (`src/app/`)
- `npm run build` — build for production
- `npm run start` — run the production server
- `npm run lint` — run ESLint
- `npm run format:check` / `npm run format` — check or format files with Prettier
- `npm run db:check` — verify PostgreSQL connection and expected table columns

## Verification

Offline unit tests (no database or running server required):

```bash
node scripts/tests/test-timezone.mjs
node scripts/tests/test-task-search.mjs
node scripts/tests/test-calendar-data.mjs
node scripts/tests/test-user-validation.mjs
```

HTTP/database integration tests (require PostgreSQL and a running Next.js server):

```bash
node scripts/tests/test-task-api.mjs
node scripts/tests/test-project-api.mjs
node scripts/tests/test-overview-api.mjs
node scripts/tests/test-overview-frontend.mjs
node scripts/tests/test-profile-timezone-api.mjs
```
