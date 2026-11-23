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
