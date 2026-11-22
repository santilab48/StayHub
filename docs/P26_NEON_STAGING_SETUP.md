# StayHub P2.6 — Neon Staging Integration (2026-11-22)

## Identity / ownership
- Neon organization `org-muddy-pond-22509064` (Chaiwat; Neon-connected account, not Vercel-managed PAIR-LIVE account).
- Neon project `late-darkness-78944075` (`stayhub-db`), Singapore region, PostgreSQL 18.
- Neon production branch `br-snowy-tree-a1kt7omx` (`production`) was NOT modified.
- Neon staging branch `br-fancy-sky-a1n96vul` (`staging`) created from the empty production branch.

## Verified schema and SQL behavior
- Applied SQL migrations `db/migrations/001–011` to Neon **staging only**, in one transaction.
- Recorded the SHA-256 checksum of the exact SQL source text per file in `stayhub.schema_migrations`.
- Read-only audit confirmed 11 migration history records and 20 base tables in schema `stayhub`.
- SQL transaction smoke inserted one test account, property, owner membership and unit, verified they existed, then rolled back to a savepoint. A second query confirmed zero remaining test accounts and units. No durable test rows were added.

## Application wiring
- Existing Next.js 15 API uses `pg` (node-postgres) connection pooling with `max: 5`. This is compatible with the hosted Railway Node runtime and Neon.
- `lib/db/postgres.ts` supports `STAYHUB_DB_PROVIDER=neon-staging` only when Railway project/environment IDs exactly match the approved Staging environment.
- Staging URL is stored as a server-only Railway environment variable `STAYHUB_NEON_STAGING_URL`; never committed or printed. `DATABASE_URL` remains unchanged as rollback path.
- Changes limited to `feat/stayhub-p26-readiness`; production remains pinned to its earlier deployment.

## CLI and tool limitations
- `npm i -g neon@latest`: timed out (exit 124) in the available ephemeral execution container.
- `npx neon@latest --version`: timed out (exit 124).
- Local StayHub git workspace was not available in that container. As a result, `neon init` / `neon deploy` were **not run**, and no generated `neon.ts` or pulled `.env.local` is claimed.
- Equivalent Postgres provisioning/schema steps were performed using the connected Neon API and application code via GitHub. Neon Functions/Auth/Object Storage were not requested for this Postgres-only setup.

## Release restrictions
- Do not delete Railway staging PostgreSQL or overwrite `DATABASE_URL` before data inventory/migration is verified.
- Do not change Railway Production variables, schema or deployment without separately approved cutover.
- Production data migration from Railway to Neon has NOT been performed.
- Backend auth/billing E2E on isolated PostgreSQL already passed; Neon staging SQL writes/rollback passed. A fresh HTTP health and authenticated E2E verification through deployed Railway staging is a separate release gate.
- Rollback for Railway staging is to omit/clear `STAYHUB_DB_PROVIDER` (while retaining Railway's original `DATABASE_URL`), then redeploy.

## Live Railway → Neon proof (2026-11-22)

- Railway staging has `STAYHUB_DB_PROVIDER=neon-staging` and a server-only `STAYHUB_NEON_STAGING_URL`; its original Railway `DATABASE_URL` remains untouched for rollback.
- [Live Neon authenticated Staging E2E: SUCCESS](https://github.com/santilab48/StayHub/actions/runs/45023907764). It exercised actual HTTPS calls to the deployed Railway app: `GET /api/health/db` → 200, anonymous `GET /api/v2/me` → 401, `POST /api/v2/register` → 201, authenticated `GET /api/v2/me` → 200, `POST /api/v2/logout` → 200, revoked session `GET /api/v2/me` → 401.
- Neon staging SQL independently confirmed the disposable email account in `stayhub.accounts` and its session in `stayhub.sessions`. This confirms the app's HTTPS registration wrote to the intended Neon branch.
- A disposable test account with prefix `p26-neon-live-` remains in Neon staging. **No SQL deletion was performed**. Remove only with separately approved cleanup and explicit target verification.
- [Read-only staging HTTP smoke: SUCCESS](https://github.com/santilab48/StayHub/actions/runs/45023844732).
- [Build, TypeScript and auth/billing PostgreSQL E2E on commit 904b12a](https://github.com/santilab48/StayHub/actions/runs/45023647574) passed.

**Not yet completed:** the exact CLI-based `neon init` / `neon deploy` flow (CLI install/network unavailable), copy or synchronization of existing Railway staging/production data, or a Production cutover. The Neon project default `production` branch remains untouched. No Railway Production secrets or data were changed.

## Live Billing E2E on actual Neon staging (2026-11-22)

- [GitHub Actions — Neon LIVE Billing HTTP E2E: SUCCESS](https://github.com/santilab48/StayHub/actions/runs/45024115101), job completed with success.
- Test code: `scripts/p26-neon-live-billing.mjs` (guarded to CI + exact Railway staging HTTPS URL).
- Workflow: `.github/workflows/p26-neon-live-billing.yml`.
- Real end-to-end scenarios passed: signup, session/logout, property/unit, QR invitation/tenant request/approval, monthly lease, water and electricity readings, duplicate meter rejection, bill issue 4,350.00 THB, issue idempotency replay/conflict, partial payment 1,500.00 THB, payment replay/conflict, concurrent remaining-payment requests (one 201, one 409), fully paid bill, cross-account isolation, lease termination, checkout, historical bill read after checkout.
- Independent SQL verification on Neon **staging** (read-only): 3 synthetic `p26-neon-billing-...` test accounts; 1 test property; 1 paid bill for 4,350.00 THB; 2 payment rows; schema migrations 11/11.
- Test records are deliberately synthetic but persist in Neon staging. No cleanup deletion was performed. Do not delete records by broad selectors; target only the verified test property/account IDs with explicit authorization and a transaction-safe plan.
- This verifies the deployed Railway staging app writing/reading the real Neon branch, but does NOT migrate Railway's pre-existing data. Neon production has not been cut over or modified.
