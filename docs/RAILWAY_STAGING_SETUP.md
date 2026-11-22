# StayHub — Railway single-project staging setup

Status: setup plan, no Railway deploy or database migration performed.

## Verified environment inventory (2026-11-22)
- Railway project: `radiant-manifestation` (`a8a5a434-4d18-438f-b4ea-ece072094595`)
- Workspace: tepakorn san's Projects
- The only environment currently visible via Railway integration is **production** (`c9c4b13a-9041-4ae6-bd50-2d02b546b053`).
- StayHub service: `3af8aa8a-2678-47f5-bdf2-aea4fa78c17a`, GitHub `santilab48/StayHub`, branch `main`, **staged-create**, not yet deployed.
- Three pending Production changes. **DO NOT click Apply 3 changes or Deploy** until specifically approved for production.
- No Railway PostgreSQL service or volume was observed.

## Single-deployment architecture
One GitHub repo `santilab48/StayHub`; one Next.js web/API service per environment; one Railway project with a **separate Postgres service** (managed infrastructure, not a second application). No separate worker, resident app, admin app or LINE OA. Device IndexedDB holds drafts; PostgreSQL holds authoritative shared data.

## Set up the staging environment — in Railway UI
1. Open project `radiant-manifestation`, click environment dropdown currently labelled `production` at top-left.
2. Choose **New Environment** / **Create Environment** and name it `staging`; if offered to duplicate from production, review all copied settings before applying. Never share production database credentials across environments.
3. In **staging**, create/add PostgreSQL from the Railway Database selector or New Service → Database → PostgreSQL. Confirm a service named `Postgres` appears in **staging**, NOT the production environment.
4. In staging's StayHub service, under Variables, set `DATABASE_URL` to a Railway reference to the PostgreSQL service: `${{Postgres.DATABASE_URL}}` (use the exact Postgres service name in this environment). Do not paste credentials into chat, GitHub, or `NEXT_PUBLIC_`.
5. Select repository `santilab48/StayHub` and the existing feature branch `feat/stayhub-p1-security-staging-audit` in **staging only**. The current production link remains `main` and must not be redeployed.
6. If Railway asks for Build/Start, repository `railway.json` provides Railpack build `npm run build`, start `npm run start`, and healthcheck `/api/health`.
7. Stage or deploy **only** the `staging` environment when the code and DB are ready. Check log build results and health check status.

## Database migration (reviewed staged step, NOT yet executed)
- The existing `db/migrations/001_stayhub_core.sql` was originally drafted for Neon, but it contains portable PostgreSQL schema definitions and can be reviewed for Railway **on an empty staging database**.
- The checked-in Supabase SQL snapshot is incomplete and not a complete production migration.
- Run a read-only target check with `SELECT current_database(), current_user, version();` before considering any migration.
- Ensure no accounts, tables or credentials from unrelated PAIR-LIVE or RecycleBill projects enter StayHub.
- Do not execute migrations against Production until a separately approved, audited plan and backup are in place.
- Database authorization and Auth replacement are not implemented. Do not publish tenant, guest, financial or contract APIs without real access checks.

## Current build and data caveats
- Existing shared-data pages still call Supabase directly. The new PostgreSQL adapter does not make those pages work on Railway by itself.
- Device workspace onboarding is local-only and not verified cloud signup.
- A PWA manifest exists, but service worker, offline sync and Web Push are not complete.
- Published invoices, bookings and payments must remain authoritative on the server.
- The plan is one Railway Project and one web service, but each Railway environment has its own deployment and database credentials.

## 2026-11-22 staging infrastructure update
- A dedicated `staging` environment now exists: `ced39691-4fe7-4707-bba7-6d0e801f1ff8`.
- PostgreSQL service `Postgres` (id `6d7766fe-b2d7-4439-ad56-9dceed09c1ee`) deployed successfully in staging; its persistent volume is bound to staging only.
- Staged-only StayHub web service `StayHub-F_Sd` (id `9274006f-7d9d-4ac1-bb3e-bc2b9e03b738`) is linked to repo `santilab48/StayHub`, branch `feat/stayhub-p1-security-staging-audit`.
- `DATABASE_URL` is staged as the Railway variable reference `${{Postgres.DATABASE_URL}}`. `NODE_ENV=production` describes the Next.js runtime mode inside a staging environment; it does NOT change the Railway environment to production.
- The staging patch has **7 non-destructive pending changes** and was **not committed/deployed**. The production environment's separate staged patch has not been touched.
- Before deploying staging: verify correct branch/region, add only test-specific Supabase variables if legacy pages require them, ensure Next.js build can start; do not substitute live production credentials or hard-coded dummy endpoints for real authentication.
- PostgreSQL migrations have not been applied. The shared modules still call Supabase; replacing those calls and implementing secure authorization remain prerequisites for a usable staging pilot.

## P1.5 migration runner — prepared, not applied (2026-11-22)

- `db/migrations/001_stayhub_core.sql`: proposed StayHub core schema, isolated under `stayhub`.
- `db/migrations/002_reservation_conflict_guard.sql`: adds a PostgreSQL exclusion constraint against overlapping confirmed / checked-in bookings for the **same** unit. It does not yet handle whole-property vs constituent rooms.
- `scripts/migrate-staging.mjs`: versioned SQL migrations, SHA-256 checksums, transaction/advisory lock, and explicit Railway project + staging environment ID guards. `--check` checks what is applied without writing.
- CI checks structure and the migration runner's guardrails with `npm run test:migration`; it does not connect to Railway Postgres or execute schema changes.

**Run procedure on a secure, authorized Railway staging shell** (not from a public Next.js route and not as an auto-deploy/predeploy command):

1. Confirm the shell receives `RAILWAY_ENVIRONMENT_NAME=staging`, `RAILWAY_ENVIRONMENT_ID=ced39691-4fe7-4707-bba7-6d0e801f1ff8`, and `RAILWAY_PROJECT_ID=a8a5a434-4d18-438f-b4ea-ece072094595` from Railway; ensure `DATABASE_URL` references the staging-only `Postgres` service.
2. Verify the target database's host/name independently, then run `npm run db:staging:check` (read-only).
3. Review both migration SQL files, take a staging backup/snapshot if existing records are present, then execute `npm run db:staging:migrate` **once** within that same Staging context.
4. Repeat `npm run db:staging:check`, and verify schema objects, isolation, and booking overlap constraint using dedicated staging test users.

**Current state:** no migration has been run; this connection cannot execute SQL in the live Railway Postgres instance through a general-purpose query tool. The scripts are deliberately NOT invoked during web deploy, because web auto-deploy must never mutate the database implicitly. Auth provider and user credential/session/verification implementation are a separate P2 gate.
