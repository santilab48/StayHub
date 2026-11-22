# StayHub P1.5 — Neon migration staging preparation

Status: **code + additive schema prepared; Neon project provisioning blocked, migration NOT applied**.

## Current provider situation (2026-11-22)

- The connected Neon organization is Vercel-managed. The create-project request for `stayhub-staging` was rejected: `action restricted; organization is managed by Vercel`.
- Existing `pair-live-db` belongs to an unrelated application and MUST NOT be used, shared or modified for StayHub.
- No privileged Supabase production DB snapshot is available via this repository; the checked-in `supabase/schema.sql` is incomplete relative to app usage. Therefore this is a clean standalone StayHub core schema, **not a data migration**.
- No DB writes/migrations were executed. No production credentials were requested, stored or committed.

## Target architecture

One Next.js deploy and ONE dedicated StayHub Neon database. Next.js server-only `lib/db/neon.ts` uses `pg` connection pooling via `DATABASE_URL` and transaction helpers. All browser traffic must go through authenticated API handlers, not directly to Neon. Keep existing Supabase client usage until secure replacement endpoints exist; switching `DATABASE_URL` alone does not migrate the app.

## Provision and verify manually when provider restriction is resolved

1. In Neon Console / Vercel marketplace integration, create a **dedicated StayHub database project**, separate from PAIR-LIVE, and a staging branch/database.
2. Set server-only `DATABASE_URL` in Staging/Preview environment (pooled connection string with TLS). Do not add it to Git or expose it with `NEXT_PUBLIC_`.
3. Before any SQL, compare database name/host, run `select current_database(), current_user, version();` and verify the destination is StayHub staging.
4. Review `db/migrations/001_stayhub_core.sql`. Only then apply it on **StayHub staging** using a migration client or `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_stayhub_core.sql`.
5. Verify `select table_name from information_schema.tables where table_schema='stayhub' order by table_name;`. Confirm zero records initially.
6. Use staging identities to build email registration, verified sessions, account-to-property membership and property-scoped permissions. **Accounts table alone does not provide secure authentication.**
7. Replace Supabase-dependent routes incrementally behind integration tests. Keep Supabase existing database unchanged until a separately approved audited data migration exists.
8. Validate tenant A/B isolation, concurrent bookings, payment data, data exports and recovery. A rollback plan must be tested before production cutover.

## Security limitations

- The migration deliberately creates server-only tables without permissive anonymous access. It does not grant browser access or implement per-user RLS.
- An admin connection can see all rows; each Next.js endpoint must authenticate the requester and enforce property-specific role checks before querying. Use dedicated least-privilege app roles and reviewed RLS after the authentication model is chosen.
- Never implement booking writes that permit overlap until the database non-overlap constraint/transaction strategy is reviewed.
- No auth tokens, slips, signatures or personal IDs in IndexedDB.

## Delivery guard

P1.5 is **in progress**, NOT a completed move. The new schema can be tested once a new Neon project can be provisioned. Do not merge/deploy production or change production environment variables without explicit approval.
