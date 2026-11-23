# StayHub P6.2 — Production cutover evidence and operational handover

Date: 2026-11-23 (Asia/Bangkok)  
Repo: `santilab48/StayHub`  
Branch: `feat/stayhub-p26-readiness`, Draft PR #2 remains unmerged.

## Verdict

**DUAL-DATABASE INFRASTRUCTURE CUTOVER: VERIFIED / SUCCESS.**  
**FULL COMMERCIAL AND DISASTER-RECOVERY SIGN-OFF: CONDITIONAL (NOT COMPLETE).**

The already-live StayHub application uses **Railway PostgreSQL** for accounts/sessions/rooms/meters/bills/payments and a separate **read-only Neon PostgreSQL connection** for subscription plans, memberships, expiration and entitlements. P6.2 introduces a mandatory production **read-only Neon predeploy check** following the existing guarded Railway database migration check, and the actual Production deployment passed both.

No old Neon operational tables, real Railway billing records, or previous production database volume were deleted, copied or altered.

## Production technical evidence

- Railway project `a8a5a434-4d18-438f-b4ea-ece072094595`, environment `c9c4b13a-9041-4ae6-bd50-2d02b546b053`.
- StayHub app service `3af8aa8a-2678-47f5-bdf2-aea4fa78c17a`: **Online, 1/1 replicas, zero warnings, zero critical issues**.
- Railway PostgreSQL `Postgres-PDqf` service `5aa5ca84-dc09-4448-8177-860bcab4ea43`: **Online, 1/1 replicas**.
- **New active deployment:** `fa736402-0a12-497c-8c48-00ab26c2a217`, **SUCCESS**, exact tested source pin `201fe3b524a35804544ae1fdd1259b6b07e09f75`.
- Railway Production migration preflight confirmed DB identity and `SKIP` for already installed migrations 001–014.
- **Observed actual production predeploy log:** `PASS P6.2 membership database identity, read-only access and schema checks (no credentials disclosed)`.
- Existing Railway platform healthcheck `/api/health/db` returned `[1/1] Healthcheck succeeded!`.
- No staged Railway changes remain.
- Neon project `late-darkness-78944075` (`stayhub-db`), Production branch `br-snowy-tree-a1kt7omx`, `neondb`: membership tables can be queried using `stayhub_membership_reader`; this role has no privileges on the old `stayhub` operational schema.
- Neon membership catalog currently contains **0 plans, 0 entitlement codes and 0 members**. This is intentional; no customer has been given an invented premium subscription.
- Neon pre-schema-migration snapshot `snap-rough-firefly-a1w6x02f` expires `2026-12-07T00:00:00Z`. This is a *Neon* snapshot, NOT a Railway production PostgreSQL backup.

## Changes in this release

- `scripts/check-membership-production.mjs`: separate read-only membership DB connection, strict Railway environment and Neon endpoint/role assertions, privilege isolation from `stayhub` business tables, explicit SELECT checks against `memberships`, `plans` and `entitlements`; refuses deployment on errors, and never logs credentials.
- `scripts/migrate-production.mjs`: retains existing operational migration and checksum checks, then invokes the new membership predeploy test. No Neon migration or membership write is performed.
- `.github/workflows/p26-isolated-http-e2e.yml`: adds same preflight SQL checks against an independent disposable membership PostgreSQL CI database, preserving all earlier HTTP auth, roles, QR, billing, PDF, two-context room sync, offline PWA and separate-db backup restoration tests.
- GitHub Actions Build/Security: https://github.com/santilab48/StayHub/actions/runs/45154309140 — **SUCCESS**.
- GitHub Actions Isolated PostgreSQL/Chromium: https://github.com/santilab48/StayHub/actions/runs/45154309156 — **SUCCESS**.
- No new customer data, Production billing changes, Neon admin credentials in the Railway runtime, destructive SQL or force-push.

## Exact outstanding operational/business gates

1. **Actual Railway PostgreSQL backups and restore evidence — not yet verified.** The Railway management connector used in this audit can read services, volumes, deployments and logs but has no ability to list or configure the Postgres service's **Backups** tab. The live volume alone is not a backup. In the Railway dashboard open project `radiant-manifestation` → **Production** → `Postgres-PDqf` → **Backups**. Verify an existing, completed restore point and enable suitable daily/weekly retention if supported by the plan; record backup time and test restoration into an isolated environment. **Never restore over the live database just to test.** If available, arrange off-site logical database copies as independent disaster recovery.
2. **Real Production authenticated room-sync write acceptance — not yet verified.** Requires a dedicated approved test account/property and a safe cleanup policy; prior Chromium A⇄B offline conflict tests pass only on isolated PostgreSQL. Do not write artificial customer data in existing properties.
3. **Commercial membership/catalog management — not complete.** Operator must define exact tiers, prices, entitlements and paid periods; existing Neon legacy accounts must be mapped only to verified Railway UUID identities; Platform Super Admin needs approved account bootstrap and audited authorization. Current production read-only membership page and guarded operator provisioning CLI cannot make up a subscription policy.
4. **Physical browser/printer testing and production rollback restore drill — not yet verified.** Do not infer these from CI or an app rollback reference.
5. **Old Neon operational tables:** preserved for safety. Do not delete until actual cutover invariants and recoverability of real Production data have been demonstrated.

## Final decision

The main Railway app + PostgreSQL and the Neon membership read-side are **live and jointly preflight-verified from Production**. The infrastructure cutover is operational. **Do not label full business launch or disaster recovery 100% complete** until explicit backup proof, subscriber business rules, privileged admin provisioning and approved production acceptance tests are available. Keep both databases, current rollout and the old Neon data intact.
