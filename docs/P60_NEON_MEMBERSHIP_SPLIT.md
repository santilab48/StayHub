# StayHub P6.0 — Split Railway operations from Neon membership/benefits

Date: 2026-11-23 (Asia/Bangkok)  
Repository: `santilab48/StayHub`; Branch: `feat/stayhub-p26-readiness`

## Intended ownership — do not delete Neon

| Data category | Authoritative database |
| --- | --- |
| Accounts / password hashes / sessions / property roles | Railway PostgreSQL `stayhub` |
| Property, units, meter readings, leases, stays, bills, payments, QR, room sync | Railway PostgreSQL `stayhub` |
| Subscription plans, member package status, expiry and perks | Neon PostgreSQL `stayhub_membership` |
| Membership grant/revoke/extend audit events | Neon PostgreSQL `stayhub_membership` |
| Device drafts/offline queue | Browser IndexedDB only |

StayHub must **not** select Neon as the sole operational app DB. The existing Railway pool `lib/db/postgres.ts` is unchanged; new server-only `lib/db/membership-neon.ts` uses a separate pool and separate secret exclusively for membership read queries.

## Implemented code (branch only)

1. `neon/membership/001_membership.sql`: new isolated Neon-only schema, tables `plans`, `entitlements`, `plan_entitlements`, `memberships`, `membership_events`. No shared foreign key, password migration, subscription pricing default, or automatic premium privileges.
2. `lib/db/membership-neon.ts`: strict provider URL and hostname check for Neon outside disposable CI. Production TLS `sslmode=verify-full` and a separate read-side pool. Membership is associated by **existing Railway account UUID**, never by user-supplied email or membership role. Exposes only valid active/trial entitlements while within a permitted subscription period. Unprovisioned, expired, suspended and cancelled users receive **no benefits**.
3. `app/api/v2/membership/route.ts`: `GET` only, session-bound, `Cache-Control: no-store`; anonymous requests get 401 and missing/unavailable Neon configuration gets 503. No client-facing grant/update/delete API.
4. `scripts/p60-membership-provision.mjs`: explicitly approved privileged **operator-only** membership issuance/extension/suspension, with strict Neon identity checks, serialized writes, plan validation, and audit event written in the same transaction. No web request may invoke it.
5. `scripts/p60-membership-http-e2e.mjs` and `.github/workflows/p26-isolated-http-e2e.yml`: CI creates a **second independent** localhost PostgreSQL database `stayhub_membership_ci` in addition to `stayhub_p26_ci`; migrates only the new schema there, registers two Railway accounts, checks benefit/expiry/cross-account scoping and 405 on attempted client grant, plus the guarded provisioning audit.

## Production and deployment safety

**Current phase: integration prepared, but NOT migrated to the real Neon branch and NOT switched on for production.** The Neon connector did not expose an eligible linked account to inspect/migrate the requested existing Neon project; attempting a blind schema change or creating a new Neon project would be unsafe.

A complete real deployment has these remaining gates:

- Confirm the correct Neon project/branch/database and existing membership data inventory, **without changing or dropping old records**. The user's earlier project reference is `late-darkness-78944075`, but this is not an authority to guess the active branch/schema.
- Examine existing plan/member records and devise a backfill mapping from their original identities to **the authenticated Railway UUIDs**. Do not invent mappings from emails or overwrite existing active memberships.
- Apply `neon/membership/001_membership.sql` only to the verified Neon branch using a migration/admin credential. Grant a separately restricted **SELECT-only** Neon role access to the four needed membership tables. Do **not** put Neon admin credentials into the Railway application runtime.
- Configure *server-side only* `STAYHUB_MEMBERSHIP_DATABASE_URL` for the read-only role and `STAYHUB_MEMBERSHIP_NEON_HOST` for the exact verified Neon host; never prefix secrets with `NEXT_PUBLIC_`. Preserve existing Railway `DATABASE_URL`, Railway login and operational DB configuration.
- After controlled staging verification, deploy the tested code and use an authorized member test account to verify read-only benefits, expiry and suspension on the real Neon instance. Keep Platform Super Admin disabled until audited provisioning/admin identity and UI are separately implemented.

## Separate, explicitly approved operator provisioning

`scripts/p60-membership-provision.mjs` accepts `--account`, `--plan`, `--status`, `--starts`, `--ends`, `--actor`, `--reason` only with `STAYHUB_MEMBERSHIP_PROVISION_APPROVED=YES` and `STAYHUB_MEMBERSHIP_ADMIN_DATABASE_URL`. Production also requires the verified exact Neon hostname, Railway project ID and environment IDs. The plan must be activated in the Neon-only plans table before issuance. The command creates/updates a membership with a version increment, and records an audit event transactionally. It does not change Railway role permissions, passwords, bills or payment ledger.

**No prices, durations, tiers, admin grants or actual customer entitlements have been fabricated.** A complete subscription billing, payment collection, owner-operated admin web UI and renewal workflow require separate explicit product rules. The GET API does not imply those are available.

## Related audit gates

Existing Railway Production app and PostgreSQL remain on the last successful deployment `173c27ab-cd5a-4e04-a611-a6c8c1cf42f5` until separately approved promotion. P5.10's missing verified **Production DB backup/restore** and **Production Write E2E** remain open; they were not solved by this membership code.

Do not delete Neon, Railway Postgres, old schemas, or Draft PR #2; do not force-push or merge without approval.

---

## Live deployment addendum — verified 2026-11-23

This addendum supersedes the earlier *not deployed* preflight status above.

**GitHub tested code:** `b57fe3da3ee1cd3de1e977ff7b0e85b5382953c7`, `feat/stayhub-p26-readiness`. Build/Security GitHub Actions succeeded; isolated HTTP and two-PostgreSQL membership E2E passed on rerun for tested application code. Previously established room sync, billing/PDF, offline/PWA and isolated PostgreSQL restore regression passed again.

### Neon verified and migrated

- Connected Neon project: `late-darkness-78944075` (`stayhub-db`), database `neondb`.
- Staging branch `br-fancy-sky-a1n96vul` and Production branch `br-snowy-tree-a1kt7omx`: ran exactly 12 additive SQL statements from `neon/membership/001_membership.sql` transactionally on each, without dropping/changing any `stayhub` operational tables. Five new tables exist in `stayhub_membership`: `plans`, `entitlements`, `plan_entitlements`, `memberships`, `membership_events`.
- Before Neon Production migration, created recovery snapshot `snap-rough-firefly-a1w6x02f` (`stayhub-pre-membership-20261123`), expires **2026-12-07 UTC**.
- Created `stayhub_membership_reader` on each Neon branch, **read_only**, scoped exclusively to `neondb.stayhub_membership`. Authorized SELECT against `stayhub_membership.memberships` passed and SELECT against old operational `stayhub.properties` was denied with SQLSTATE `42501` on both branches.
- Production new membership tables contain **0 plans and 0 member rows** initially, intentionally. The old Neon `stayhub.accounts` table still has **1 record** and was not touched or assumed identical to a Railway login. There is no automatic paid grant or migration of old identities without a verified mapping.

### Railway deployed successfully

- Staging existing StayHub service `9274006f-7d9d-4ac1-bb3e-bc2b9e03b738`: deployed `d2aa8818-3cd6-4def-9ae6-924b5a844184`, **SUCCESS** with `STAYHUB_MEMBERSHIP_DATABASE_URL` and `STAYHUB_MEMBERSHIP_NEON_HOST` pointing to Neon Staging using the least-privileged read-only role.
- Production existing StayHub app service `3af8aa8a-2678-47f5-bdf2-aea4fa78c17a`: staged one non-destructive source update pinned to **`b57fe3da3ee1cd3de1e977ff7b0e85b5382953c7`** and added the two Neon Production membership connection variables (secrets never emitted), then deployed **`7bc21577-726f-43e2-9ea3-748996a6ace3` — SUCCESS**.
- Railway Production App and PostgreSQL `Postgres-PDqf`: both **Online, 1/1 replicas, zero warnings and zero critical issues** after rollout. Production Next.js compiled, all existing Local-First build-gate tests passed 12/12, guarded production database predeploy verified identity and **SKIP 001–014** (already installed), and Railway healthcheck returned `[1/1] Healthcheck succeeded!`.
- Existing Railway operational `DATABASE_URL`, DB provider, PostgreSQL volume, room/bill/payment schema, UI/UX and Draft PR #2 were not modified by the membership deployment.
- Previous app deployment `173c27ab-cd5a-4e04-a611-a6c8c1cf42f5` (old source pin `d163b4d`) is the release rollback reference; Neon pre-migration snapshot provides a separate rollback reference for the additive membership-schema change.

### Verified scope and remaining business configuration

**Operationally complete:** split-data schema and isolated read-only connection; authenticated membership API deployed to Railway; production app/DB healthy and test-proved membership identity/expiry/status behavior on isolated two-database CI; Neon read-only role restricted on both real branches.

**Not yet configured:** actual subscription catalog/prices, verified historical Neon-account-to-Railway-account mapping, specific subscriber entitlements, and public Platform Super Admin management UI. No customer memberships were copied and no premium status is silently granted. Authorized authenticated Production HTTP membership read-through has not been exercised with a dedicated real test account; Railway's healthcheck only proves the primary Railway database, while independent Neon role SELECT checks prove Neon-side connectivity/permissions. Existing PostgreSQL production-backup/restore and end-to-end Production room-write gates from P5.10 remain separate.

**Security rule:** the operator-only provisioning script uses a separate admin database secret and explicit approval; Railway application has only read-only Neon credentials. Never place the admin secret in public frontend variables.
