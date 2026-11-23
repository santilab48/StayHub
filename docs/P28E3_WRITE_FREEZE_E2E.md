# P2.8-E3 — Staging write-freeze E2E and cutover safety

Date: 2026-11-23 (Asia/Bangkok). Branch: `feat/stayhub-p26-readiness`.
**Production cutover: NO-GO. No Production deployment or variable change was performed.**

## Scope and identities

| Check | Result | Evidence |
| --- | --- | --- |
| Initial remote HEAD / clean feature worktree | PASS | Remote `e3dc7b468d5a5ee858ea9e284a90638cf7330e19`; isolated worktree initially clean. Other worktrees and their uncommitted files preserved. |
| Initial Railway Staging deployment | PASS | `3d55c50e-e0fc-4d5b-b7ca-011262e3dbb8` SUCCESS at `e3dc7b4`. |
| Staging database binding | PASS | Staging app accepted synthetic registration `p28e3-binding-20261123@example.invalid` (201) after thaw. Read-only exact count on Neon project `late-darkness-78944075`, Staging branch `br-fancy-sky-a1n96vul`, database `neondb`: 1; Production branch `br-snowy-tree-a1kt7omx`: 0. App TLS probe returned 200 `tls:true`. Railway Staging provider variable is present, but OAuth does not expose its value; the distinct synthetic row is the actual binding evidence. |
| Initial freeze state | PASS | `STAYHUB_WRITE_FREEZE` absent from Staging variables; `/api/health/db/freeze` 503 `{status:'not_frozen',readOnly:false}`; DB health 200. |

## Freeze test and bug fix

The first Staging freeze deployment `8afab6de-78bd-4085-8210-ceac62c8723e` succeeded. `/api/v2/me`, registration POST and bill POST returned 503, and DB health/TLS remained 200. However, the freeze probe returned 503 `readOnly:false`, so this attempt **FAILED**. Staging was promptly set to `STAYHUB_WRITE_FREEZE=NO`; thaw deployment `8030e27a-d650-432e-b3db-7bbe4af5a026` succeeded.

The probe read a nonexistent `read_only` column from `SHOW default_transaction_read_only`. The fix runs permitted health queries in explicit `BEGIN READ ONLY` transactions and selects `current_setting('transaction_read_only') AS read_only` inside the same transaction. This avoids relying on a startup default through the Neon transaction pooler. Regression contract updated. Two code commits were pushed: `465b7720d46857f436ec28bf050642a4aa6d57a4` and `38681c00b4fd53f8f4dc052143f10d1de440564c`. The intermediate deployment `94a4da75-fdb3-4fe5-b450-044f67c72941` still exposed the probe column bug; thawed before the final fix.

| Final Staging freeze check | Result | Actual observation |
| --- | --- | --- |
| Final code deployment, unfrozen | PASS | `80b749c9-5dad-4432-8b78-d560fc130ee8` SUCCESS at `38681c0`. |
| Freeze deployment | PASS | `f9bc1721-22b8-4270-8f62-838f61913ef4` SUCCESS at `38681c0`, with only Staging service variable set to `YES`. |
| Read-only transaction through app | PASS | GET `/api/health/db/freeze` 200 `{status:'frozen',readOnly:true}`. This proves the probe's transaction mode, not a global database setting. |
| DB health and TLS while frozen | PASS | `/api/health/db` 200 database ready; `/api/health/db/transport` 200 `tls:true`. |
| Writes and session-capable API blocked | PASS | GET `/api/v2/me`, POST `/api/v2/register`, POST `/api/v2/bills` each 503 maintenance. |
| Rejected requests create no rows | PASS for observed sample | Immediately before/after frozen requests, Staging exact counts remained accounts 41, bills 10, payments 20, meter readings 20; targeted rejected email exact count 0. Earlier CI runs legitimately added synthetic rows before this baseline. |
| Thaw | PASS | Set Staging flag to `NO`; deployment `6d0b4a72-1732-4d1c-ab6b-490036c6e35f` SUCCESS at `38681c0`. Probe 503 `not_frozen`, DB health 200, anonymous session endpoint 401, synthetic registration 201. Staging was not left in maintenance mode. |

**Limit:** The middleware blocks requests to this app instance while enabled. `BEGIN READ ONLY` protects the three permitted health probes. Other DB clients, old in-flight instances, direct SQL, and database users are not globally frozen; Production has not been tested with this flag. An independent ingress/drain and DB writer-control gate remains mandatory before a cutover.

## Build, CI and live regression

- Local `npm run typecheck` and `npm run build`: PASS after the final probe correction. `test-p28e2-write-freeze.mjs`, `test-billing-final-audit.mjs`, `test-billing-migration-contract.mjs`, `test-p28e-cutover-preflight.mjs`, `test-p28cd-neon-transport.mjs`, `npm run test:structure`, and `test-billing-ui-contract.mjs`: PASS. Static tests are not counted as HTTP E2E.
- [CI build/security 45094135498](https://github.com/santilab48/StayHub/actions/runs/45094135498), [freeze guard 45094135501](https://github.com/santilab48/StayHub/actions/runs/45094135501), [isolated Auth/QR 45094135502](https://github.com/santilab48/StayHub/actions/runs/45094135502), and [Staging smoke 45094135461](https://github.com/santilab48/StayHub/actions/runs/45094135461): SUCCESS at `38681c0`.
- Full post-thaw Auth/QR/Lease/Meter/Billing/Payment/Concurrency/Role HTTP E2E: **PASS**. Ran `CI=true P26_NEON_LIVE_E2E_BASE=https://stayhub-fsd-staging.up.railway.app node scripts/p28cd-neon-live-readiness.mjs` with exit 0 at the final thawed deployment. Actual responses included owner/tenant registration 201, QR join/approval 201/200, stay and lease 200/201, water/electric meters 201, decreasing and duplicate meter 409, two simultaneous monthly bills 201+409, idempotent replay 200, wrong payload 409, tenant issue/payment 403, partial cash payment 201, overpayment 409, simultaneous payments one accepted/one rejected, paid details and history 200, checkout after lease termination 200, historical tenant bill/payment balance 200, logout/relogin 200. This run creates disposable Staging fixture rows. It does not exercise a browser UI or prove database-wide freeze.

## Production read-only safety and rollback

- Railway Production app deployment `9ea2bd37-cc82-49e7-83a4-01465477e2b2` remains SUCCESS at old commit `81338194aec3d3bd646e6bbe51215ffb9eb530dc`, branch `feat/stayhub-p1-security-staging-audit`. `DATABASE_URL` variable name remains present, but OAuth redacts its value, so bytewise unchangedness **BLOCKED**. No Production variable mutation was made in this work.
- Existing `Postgres-PDqf` service `5aa5ca84-dc09-4448-8177-860bcab4ea43` is live with preserved `postgres-volume-zENI` volume. Neon Production read-only exact `COUNT(*)` in all 19 business tables returned zero; 20 tables including `schema_migrations`, which has 11 rows. No Neon Production write was made.
- Rollback remains a controlled future operation: preserve the original Railway `DATABASE_URL`, use separate `STAYHUB_NEON_PRODUCTION_URL` only when provider is explicitly `neon-production`, and select the Railway provider again before any Neon writes. If either side received new writes, freeze both and reconcile before repointing. The old secret's recoverability and full Production traffic freeze are **BLOCKED**, not inferred from variable names or the Staging test.

**Remaining gates:** independent Production write-stop and in-flight drain, fresh Railway Production exact counts under that stop, secure recovery proof of original Railway URL, Production promotion and TLS checks only under separate owner authorization. No merge, Production deployment, Production migration or cutover occurred.
