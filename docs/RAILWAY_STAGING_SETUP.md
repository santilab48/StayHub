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
