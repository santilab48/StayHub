# P2.8-C/D — Backend, Auth and Billing readiness

Date: 2026-11-22 (Asia/Bangkok). Branch: `feat/stayhub-p26-readiness`.
Verified implementation commit: `2d51dd9ca9c2b95f9506e6d9faece5c36a415b95`. This report is a later documentation-only commit.

## Environment and evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Git baseline | PASS | Remote fetched at `c51376dad3cd36a6a95abdf812e997b53dde2d2a`; a separate clean review worktree was used. Original worktrees and their uncommitted files were preserved. No reset, clean or force push. |
| Staging identity | PASS | Railway project `a8a5a434-4d18-438f-b4ea-ece072094595`, staging environment `ced39691-4fe7-4707-bba7-6d0e801f1ff8`, service `9274006f-7d9d-4ac1-bb3e-bc2b9e03b738` deployed branch commit `2d51dd9` successfully. The existing DB provider guard permits Neon only in this exact Railway project and environment. `STAYHUB_DB_PROVIDER=neon-staging` and `STAYHUB_NEON_STAGING_URL` are configured; `DATABASE_URL` was not changed. Credentials were not copied into this report. |
| Neon branch isolation | PASS | Read-only SQL on project `late-darkness-78944075` (`stayhub-db`), staging branch `br-fancy-sky-a1n96vul`, `neondb`, showed `stayhub` 20 tables and 11 migrations, with synthetic billing records. Production branch `br-snowy-tree-a1kt7omx`, `neondb`, independently showed 20 tables, 11 migrations, **0 accounts and 0 bills** after the live tests. This supports staging routing and confirms no Production test records. |
| Staging app transport | PASS | `GET /api/health/db/transport` on the deployed Railway app returned HTTP 200 `{"status":"ok","tls":true}`. The probe uses the same `pg` pool and checks that the live client socket is encrypted **and** its certificate is authorized. Neon staging URL now enforces `sslmode=verify-full`; the probe is 404 outside the approved staging environment. |
| Neon Production SQL | PASS, read-only | `current_database()=neondb`, `current_user=neondb_owner`, 20 `stayhub` tables, 11 migration rows, 0 accounts and 0 bills. No Production SQL writes, schema changes or test accounts. The full 11 checksum and 19 business table audit remains documented in `P28B_NEON_PRODUCTION_VERIFY.md`; this task rechecked counts, not every checksum. |

The first `pg_stat_ssl` probe returned false even after enforcing TLS. That view describes the PostgreSQL backend hop behind Neon pooler rather than necessarily the app-to-pooler socket. The app-side probe fixed this measurement issue. The earlier `sslmode` configuration did not explicitly require certificate and hostname verification; the code now forces `verify-full` for Neon staging only. The final socket test confirms encrypted and authorized transport. No Railway Production settings were modified.

## Live HTTP E2E and database checks

GitHub Actions [run 45030049185](https://github.com/santilab48/StayHub/actions/runs/45030049185) completed **success** on implementation commit `2d51dd9`. The job first verified the TLS configuration and waited for the actual Staging app probe, then ran `scripts/p28cd-neon-live-readiness.mjs` against `https://stayhub-fsd-staging.up.railway.app`. A separate earlier [run 45029890490](https://github.com/santilab48/StayHub/actions/runs/45029890490) also passed the full HTTP script. Both used unique `example.invalid` fixture accounts and the existing authentication/session endpoints.

| Case | Result and observed evidence |
| --- | --- |
| Register, login, session, logout, rate limit | PASS: four fixture accounts registered (201), sessions (200), wrong credentials (401), weak password (400), eight bad attempts (401) then throttle (429), logout (200) and revoked cookie (401), new login (200). |
| Property, role and QR flow | PASS: two owners created separate properties; cross-owner unit, lease and join-request reads and meter write denied (403). Invitation created, tenant joined by QR token, owner approved, tenant saw the assigned Stay. |
| Lease, meter and bill | PASS: active lease rent 4,000; first water/electric readings accepted (201), decreasing reading and duplicate month rejected (409); issued rent + water + electricity + other amount totaling **4,350.00**. Same idempotency key replayed the bill (200), changed payload and duplicate lease/month rejected (409). |
| Tenant and owner isolation | PASS: anonymous session (401), another owner and another tenant bill reads (404), tenant bill issue and payment confirmation (403), tenant sees own bill and only balance, not internal payment list. |
| Payment and history | PASS: cash 1,500 produced partial with 2,850 outstanding; 2,850.01 overpay rejected (409); identical payment key replayed (200) with same payment ID; altered payload rejected (409); two simultaneous 2,850 transfer requests with distinct keys gave exactly one 201 and one 409; final paid=4,350, outstanding=0; owner history contained exactly two payments. |
| Checkout and retained history | PASS: checkout with active lease rejected (409), lease terminated (200), checkout succeeded (200), tenant still read own bill and balance afterward. |
| PostgreSQL reconciliation | PASS: read-only Neon Staging SQL found three synthetic `CI Test Property %` bills (including prior fixture runs), each total 4,350.00, status `paid`, exactly two payments totaling 4,350.00. |
| Issued snapshot immutability | PASS: attempted UPDATE of one specifically identified synthetic staging bill item returned `SQLSTATE 23514`, `Issued billing snapshots are immutable`; read-back remained 4,000.00. |

Existing P2.6 live E2E results, isolated PostgreSQL tests and migration checks were reviewed in `P26_NEON_STAGING_SETUP.md` and `P26_ISOLATED_HTTP_E2E.md`. This P2.8-C/D run supplies fresh HTTP and app transport evidence; no migration was run here.

## Build, tests and fixes

- Local `npm run typecheck`: PASS; `npm run build` (Next.js 15.5.29): PASS on the final route code.
- Eleven local scripts passed: migration contract, ID binding, billing migration, bill generation, payment recording, bill history, final billing audit, billing UI contract, structure, P1 audit and new Neon TLS transport regression. Static scripts do not replace live PostgreSQL assertions above.
- GitHub Actions run 45029366194 initially failed because the first TLS probe observed the pooled backend hop as insecure. Run 45029768643 failed at `npm ci` because this repository has no `package-lock.json`. Both failures were corrected. The final run 45030049185 and Railway staging deployment of `2d51dd9` succeeded.
- Changes: `lib/db/postgres.ts` enforces staging Neon TLS certificate and hostname verification; `app/api/health/db/transport/route.ts` checks the real app socket with a staging-only guard; `.github/workflows/p28cd-live-readiness.yml` runs the live test; `scripts/p28cd-neon-live-readiness.mjs` adds the cases above; `scripts/test-p28cd-neon-transport.mjs` guards the TLS configuration.

## Remaining gates before Production

- **NOT TESTED in this run:** live simultaneous monthly bill generation with two requests; this run proved sequential duplicate-month rejection and concurrent payments. The older isolated PostgreSQL and billing tests provide other concurrency coverage, but no fresh simultaneous bill HTTP claim is made here.
- **NOT TESTED:** Railway Production-to-Neon Production application TLS, authentication and billing. Production has no fixture data and remains uncut over. No Production deployment, migration, variable change or merge occurred.
- **Production readiness:** Staging backend and billing E2E **PASS** for the cases above; Production cutover **NOT APPROVED by this report**. The owner must explicitly authorize the separate cutover, then verify Production app connectivity/transport and rollback gates without using real user data for test fixtures.
