# StayHub P2.5 — Staging release follow-up

- Based on audited commit `7d1437b` containing P2.5-A–F.
- Added `/cloud/billing` connected to Postgres-backed v2 meter, monthly bill, payment and history APIs. Owner dashboard links to it; tenant `/my` bill tile links to it as well. This is a deliberately separate Cloud billing workspace; the legacy Supabase tenant-specific finance screens are not migrated.
- Uses owner-property membership from the existing Cloud session. A tenant's list with no owner property is restricted by `billing_bills.account_id` on the server, including former stays. Detail and payment APIs already check property/account authorization.
- The payment and bill forms reuse idempotency keys for identical retries until the server confirms success. Meter duplicates and invalid readings remain blocked server-side.
- Static/unit checks and TSX syntax passed; runtime Next.js build/HTTP integration NOT run in this isolated workspace, because dependencies were not available. PostgreSQL migration 010–011 is NOT executed and is NOT verified against an isolated database.
- `node scripts/test-billing-ui-contract.mjs` covers wiring/TSX syntax. Run full build, regression and integration tests on an environment with dependencies.
- Railway Staging must run migrations 010 and 011 via an authorized **one-time** migration command after verifying the migration ledger and database identity; do not add migration execution to an automatic `start` or `preDeploy` command. Production remains unchanged.
