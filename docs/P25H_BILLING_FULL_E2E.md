# StayHub P2.5-H — Isolated PostgreSQL and Billing QA

Date: 2026-11-22 (Asia/Bangkok)
Repository/branch: `santilab48/StayHub` / `feat/stayhub-p1-security-staging-audit`
Base commit: `aa5ea645f749afb11f52eeec61e55a3e1cb42e0f`

## Acceptance status

**PostgreSQL migration and selected behavioral tests passed. Full HTTP/UI E2E did not run. Production is not ready.** Railway refused creation of the separate test web service with `Free plan resource provision limit exceeded`. The staging/production databases were not used for synthetic test traffic. No production deployment or migration occurred.

## Isolated test identity and migration evidence

- Created private Railway project `stayhub-billing-test` (`bd5f1b6e-b02d-414e-b15c-115c198e7f48`) and its `test` environment (`cd429dd4-60de-4dbd-9665-1af69c314873`), separate from StayHub staging project `a8a5a434-4d18-438f-b4ea-ece072094595` and its staging environment `ced39691-4fe7-4707-bba7-6d0e801f1ff8`.
- Provisioned a PostgreSQL service with its own volume. No public database TCP proxy or real-user data copy was created. The test runner checked Railway project/environment identifiers, `current_database() = railway`, the server address inside Railway's private network, and absence of `stayhub.schema_migrations` before applying SQL. The private address and all credentials are omitted here.
- On this verified empty database only, executed source migrations `001` through `011` in order within one transaction. Runner deployment `4d3fd0cc-b150-420e-9fb4-d49951282720` logged each `APPLIED_TEST` with SHA-256 and returned 11 ordered history rows. Catalog query returned 277 constraints, 10 noninternal triggers, and 64 indexes across the schema. This counts objects; it does not claim every object was individually exercised.
- A later read-only runner was installed to avoid replaying fixture inserts on redeployment. Migration files and the existing staging migration runner were not changed.

## PostgreSQL behavioral results

The following ran with synthetic accounts, properties, rooms, stays, leases, meters, bills, and payments in the isolated database. Runner `4467812a-8008-4b7c-adfb-9cc879e6be31` logged 17 passing assertions; runner `44cd6a9e-8bf2-4cb7-901d-1b2361709664` logged 5 more. Failed input assertions observed actual PostgreSQL rejection codes `23503`, `23505`, or `23514` as applicable.

| Scenario | Observed result |
| --- | --- |
| Migration history 001–011 | 11 rows, ordered and checksummed. |
| Meter property/unit mismatch; lease account/stay mismatch; bill account/lease mismatch; payment property/bill mismatch | All rejected by database constraints. |
| Meter amount, month isolation, duplicate month, decreasing reading | Water 10 units × 10 = 100.00; electricity 20 × 10 = 200.00; separate November reading inserted; duplicate and decreasing values rejected. |
| Bill items and snapshot guards | Rent 4,000.00, water 100.00, electricity 200.00, other 50.00 formed a finalized 4,350.00 bill; item and billed meter updates rejected. Duplicate lease/month rejected. |
| Payment amounts and status | 1,500.00 produced `partial`; remaining 2,850.00 produced `paid`, paid sum 4,350.00 and exactly two payment rows. Negative and excess payments rejected. |
| Concurrent same idempotency key | Two simultaneous 2,850.00 inserts: exactly one succeeded; final sum/count remained 4,350.00/two. |
| Concurrent distinct keys competing for remaining balance | On a separate 4,000.00 bill, two simultaneous 3,000.00 inserts: exactly one succeeded, sum 3,000.00 and `partial`; final 1,000.00 produced `paid`. Confirmed payment update rejected. |

The first attempt of the behavioral runner stopped on an **invalid synthetic request hash** supplied by the test fixture. The fixture was corrected to a 64-character hash and the entire test reran successfully. This was not an application defect. PostgreSQL assertions do not prove the HTTP authorization or browser flow.

## HTTP, security and UI evidence

**Not run:** owner signup and property/unit creation through HTTP; tenant QR join and approval; stay/lease creation through HTTP; meter, bill and payment APIs with real session cookies; bill history after room change/checkout; owner and tenant cross-property/account 401/403 checks; button double-click; authenticated browser checks at 360, 390, 768 and 1280 px. No authenticated screenshots exist, so none are claimed. The database fixtures above were inserted by the test runner, not the application API.

The Railway connector rejected a separate GitHub-backed test web service in the isolated project: `Free plan resource provision limit exceeded`. The isolated test project has only PostgreSQL and a private script runner. The Next.js Cloud API is also gated to the approved staging environment; a proper isolated web deployment would require an explicit test-environment allowance that still excludes production. A temporary local candidate for this allowance was typechecked and built, then discarded because the web service could not be provisioned; no application code change was pushed.

## Code checks and staging status

- Local `npm run typecheck`, `npm run build`, `test-migration-contract`, and `test-id-binding-contract` passed on the base source. These are supplemental checks, not substitutes for HTTP E2E.
- Staging web deployment `ed49554d-2161-4e7f-9d1d-09df82fc31c2` at `aa5ea645` remains `SUCCESS`, online with one running replica. Railway reports historical failed deployments but no current critical or warning issue. Staging configuration, variables and database were unchanged by this test.
- No reproducible product bug was established; no Billing UI, schema, API, session or production code was modified. The only repository change for P2.5-H is this report.

## Remaining release gate

Provision a separate test web service or free a Railway resource slot through an approved project decision, without pointing Staging/Production at the test database. Enable Cloud auth solely for the isolated project/environment, use disposable accounts through the existing signup and session flow, execute the full HTTP/QR/billing/security/concurrency sequence, compare results with PostgreSQL, and capture authenticated screenshots at each requested viewport. Re-run TypeScript, Build and regression checks after any fix. **Do not approve production from these database-only results.**
