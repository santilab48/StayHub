# StayHub P2.5-G — Billing E2E QA

Date: 2026-11-22 (Asia/Bangkok)
Branch: `feat/stayhub-p1-security-staging-audit`
Base commit: `8c3b099a85ba455a9f16da946499267a8f378d4a`
Staging: https://stayhub-fsd-staging.up.railway.app/cloud/billing

## Result and release gate

**E2E is not passed or complete. Production is not ready.** No isolated PostgreSQL test database or authenticated owner/tenant test accounts were available to this workspace. No staging or production data was written, no migration was executed, and no billing code was changed during this pass. The findings below distinguish observed results from source checks.

## Evidence obtained

- Remote branch HEAD and the clean detached review worktree initially matched `8c3b099a85ba455a9f16da946499267a8f378d4a`. Earlier local worktrees and their uncommitted files were left untouched.
- Railway staging web deployment `5776d01b-1087-4af6-8402-dd80e33cbe71` for that commit reports `SUCCESS` and its runtime reached `Ready`. Both staging web and PostgreSQL services were reported online. Historical SIGTERM entries were present around replacement deployments; no current deployment failure was established.
- Staging web runtime logs include `APPLIED 010_billing_identity.sql` and `APPLIED 011_bill_issue_idempotency.sql` at 2026-11-22 07:45:44 UTC. This proves the runner logged their application in staging; it does not independently verify the live catalog, migration checksums, constraints, triggers or behavioral effects.
- The live `/cloud/billing` browser page rendered the billing heading and tenant list shell, showing `Please sign in` and no bills. This is an unauthenticated page check only. Authenticated UI, form operation, network behavior and viewport sizes were not tested.
- `npm run typecheck`: passed. `npm run build`: passed (Next.js 15.5.29, compilation, TypeScript and static page generation).
- Ten local scripts passed: `test-migration-contract`, `test-id-binding-contract`, `test-billing-migration-contract`, `test-bill-generation`, `test-payment-recording`, `test-bill-history`, `test-billing-final-audit`, `test-billing-ui-contract`, `verify-structure`, and `p1-audit`. Run with `NODE_OPTIONS=--experimental-strip-types node scripts/<name>.mjs`. These are source and arithmetic checks, **not PostgreSQL integration or authenticated HTTP E2E tests**. The structure audit reports pre-existing bundled-schema gaps for legacy Supabase objects; it is not a declaration that those live objects are missing.

## E2E and security cases

| Case | Result |
| --- | --- |
| Owner creates property and unit; tenant joins by QR; owner approves; creates stay and lease | Not run: no disposable accounts/property or isolated test database. |
| Record first and subsequent water/electric readings; reject decreases and duplicates | Static calculation/schema checks passed; HTTP and PostgreSQL behavior not run. |
| Generate rent, utilities and other items; monthly uniqueness; lease/stay/unit/property binding and immutable snapshots | Static checks passed; transactional E2E not run. |
| Partial cash/transfer payments, paid balance, replay key and concurrent overpayment | Static arithmetic/lock checks passed; concurrent PostgreSQL requests not run. |
| Owner/tenant bill history after room transfer and checkout | Static scope/pagination checks passed; authenticated E2E not run. |
| Cross-property owner denial, cross-account tenant denial, tenant payment denial | Static authorization checks passed; authenticated HTTP attempts not run. |
| 360, 390, 768 and 1280 px; overflow, buttons, validation, stale selection, JavaScript errors and repeated payment clicks | Not run at requested sizes. Only unauthenticated default browser view was observed. |
| Staging migration history, catalog constraints, FKs, unique indexes, triggers and locking | Application log confirms 010–011 were applied; live catalog and behavioral checks not run. |

## Issues and fixes

No new reproducible billing defect was established in this pass; therefore there was no speculative code change or regression test. The earlier stale billing response fix at `8c3b099` was preserved. The missing isolated database and test identities block the requested E2E acceptance. Building this worktree regenerated `next-env.d.ts`; that generated difference is excluded from the QA commit. Existing local worktrees retain their original uncommitted content.

## Required before production

Provide an explicitly disposable PostgreSQL test database with identity verified distinct from staging/production and isolated owner/tenant test accounts. Execute migrations and the full property → QR → stay/lease → meter → bill → partial/paid → history → move/checkout flow there. Verify concurrent idempotency/overpayment and cross-identity requests, inspect `pg_catalog` and migration history, then run authenticated browser QA at 360/390/768/1280 px and document evidence. Recheck the deployed staging revision afterward. Do not infer production readiness from a successful build or staging deployment.
