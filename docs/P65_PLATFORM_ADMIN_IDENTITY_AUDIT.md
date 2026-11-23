# P6.5 — Platform Admin identity and approval audit

Date: 2026-11-23 (Asia/Bangkok). Branch: `feat/stayhub-p26-readiness`.
Starting remote HEAD: `fb01090b9d5980d286922b47f87b86684d39e3da`.

## Result

P6.4 already had two Ed25519 signatures, a separate offline provisioning CLI, a Neon grant/revoke registry, and an append-only audit trigger. P6.5 found that neither signature was bound to a Railway account identity. Thus a signer could target their own account while still presenting two valid keys. The CLI now requires two distinct configured signer Railway UUIDs, checks all three UUIDs in the independent Railway identity database, and rejects a target equal to either signer for both grant and revoke. Signature validity and one-time request ID remain mandatory. The audit event now records both signer UUIDs alongside key fingerprints. A new additive Neon membership migration `004_platform_admin_approvers.sql` enforces distinct, non-target signer UUIDs on every new audit insert. Existing audit rows remain unchanged; the new trigger is idempotent.

For staging, the CLI now checks that the dedicated `stayhub_identity_reader` has SELECT on `stayhub.accounts.id` but no INSERT, UPDATE, DELETE, or TRUNCATE on any `stayhub` table, no elevated database role flags, and no inherited roles. This is a preflight, not a replacement for independent review of the Railway role. A disposable PostgreSQL role with SELECT on `accounts.id` only read IDs and could not read email or write the accounts table.

## Verification performed

- Isolated PostgreSQL 16: operational database with migrations 001–014, separate membership database with migrations 001–004. Grant, revoke, replay rejection, invalid/duplicate signatures, nonexistent identities, signer-as-target rejection, duplicate signer identity rejection, audited signer UUIDs, and immutable event UPDATE/DELETE all passed.
- Read-only fixture role: `accounts.id` SELECT true, `accounts.email` SELECT false, INSERT/UPDATE/DELETE/TRUNCATE false.
- `npm run typecheck`: passed. `npm run build`: passed. No browser or Production test was run for this backend-only change.

## Staging and release gates

Previous P6.4 evidence in `docs/P64_PLATFORM_ADMIN_DUAL_APPROVAL.md` identifies Neon Staging project `late-darkness-78944075`, branch `br-fancy-sky-a1n96vul`, database `neondb`, with migration 003 installed and zero audit events then. This environment has no Neon/Railway credentials or management connector, so the **current** Staging identity, role grants, schema, and database separation could not be independently queried in P6.5. Migration 004 was **not** applied to Staging. No staging grant/revoke was attempted.

Before staging acceptance, independently verify project/branch/database and Railway staging environment, inspect existing migration history, install only missing migration 004, verify the narrow Railway reader role and Neon writer role, and approve two real human operators whose protected keys are bound to the configured Railway account UUIDs. A UUID and signature verify technical identity; they do not by themselves establish that two different humans controlled the keys. Run an authorized staging grant/revoke, check both audit events and revocation, then recheck reader isolation. No Production data, account rights, database, variables, or deployment were changed. No real admin was created. P6.6 was not started.


## Addendum — Verified Neon Staging migration 004

The original P6.5 report correctly documented that Staging was unavailable in that earlier isolated environment. **A later connected verification has now resolved that specific schema blocker.**

- Connected Neon project `late-darkness-78944075`, branch `br-fancy-sky-a1n96vul`, database `neondb`.
- Before migration, `platform_admin_events` existed with eight columns and **0 audit rows**; `platform_admins` contained **0 admins**.
- Reviewed the exact `neon/membership/004_platform_admin_approvers.sql` from remote branch and applied the three intended statements **transactionally on Neon Staging only**: nullable approver UUID columns, approver validation function, idempotent BEFORE INSERT trigger.
- Post-migration verified columns `approver_a_railway_account_id` and `approver_b_railway_account_id`, and triggers `platform_admin_events_approvers` (BEFORE INSERT) and `platform_admin_events_immutable` (BEFORE UPDATE/DELETE).
- Verified Neon `stayhub_membership_reader` can SELECT the audit relation. Membership platform admin and audit row counts remain **0 / 0**.
- No staging grant/revoke was performed, no real approval keys or admins were created, and nothing was changed on Neon or Railway Production.

**P6.5 Neon Staging schema gate: PASSED.** The separate Railway Staging `stayhub_identity_reader` least-privilege role and real authorized two-person operator acceptance remain **UNVERIFIED**, so this report does not declare the whole P6.5 production-release process complete.


## Addendum — Railway Staging live role verification (2026-11-23)

A separate staging-only read-only diagnostic has now checked the actual Railway Staging PostgreSQL:

- Diagnostic script: `scripts/p65-railway-identity-reader-check.mjs`, locked to StayHub Railway project `a8a5a434-4d18-438f-b4ea-ece072094595`, Staging environment `ced39691-4fe7-4707-bba7-6d0e801f1ff8` and database `railway`.
- The script only runs `BEGIN READ ONLY` and catalog/privilege queries; it never creates users, changes grants or prints connection secrets.
- **Observed actual Staging deployment log: `BLOCKED P6.5: stayhub_identity_reader does not exist on Railway Staging`.** Two diagnostic deploy attempts refused in predeploy, with no database changes.
- The temporary diagnostic predeploy setting was then removed, returning it to `[]`. New Staging app deployment `37a75665-581a-43d4-9655-5e8ca6cf08e9` reached **SUCCESS**. No staged Railway changes remain.
- The dedicated least-privilege Railway identity reader must be provisioned with a securely managed credential and column-level `SELECT` on `stayhub.accounts.id` only (not emails or business data), then rerun this exact preflight. A Railway application admin DB connection should never be substituted as the operator identity reader.
- Separately, two negative INSERT tests against real Neon **Staging** `platform_admin_events` were rejected by `validate_platform_admin_event_approvers()` (SQLSTATE `P0001`): duplicate approver IDs and target=self-approver. No audit row was inserted.
- No Production database or app was modified. No real Admin identity, approver signing keys or account privileges were created.

**Updated P6.5 verdict:** Neon Staging migration and trigger validations PASS; Railway Staging `stayhub_identity_reader` is **confirmed missing**, so the end-to-end authorized two-person operator acceptance remains BLOCKED. This is a confirmed missing prerequisite, not merely a connectivity uncertainty. P6.6 was not started.

## Final fix request — Railway Identity Reader (2026-11-23)

Remote HEAD before this update: `b059a0da63370fd9860ccc4989c9b2bb6bf6a6b9`. The latest live evidence above confirms the role is missing on Railway Staging. In this execution environment there is **no Railway management connector, Railway credential, or Staging database connection**. The role could not be created safely or its credential stored in Railway. The required live run of `scripts/p65-railway-identity-reader-check.mjs` was **not performed**. The Railway Identity Reader gate remains **BLOCKED**, despite the prior live diagnostic evidence.

The check now rejects SELECT on **any other column** in `stayhub`, covering account email/password data and property/billing data, in addition to rejecting writes, inherited roles and elevated role flags. On disposable PostgreSQL 16 with a fake `railway` database, a reader granted only `accounts.id` passed; adding `accounts.email` SELECT made the script refuse. This is a local script test, **not** a Railway Staging result. Separate disposable operational and membership databases passed the signed grant/revoke, replay, self-grant, and immutable audit suite. No real administrator or Production data was touched.

To close this gate, a Railway Staging administrator with verified database identity must create the dedicated LOGIN role (or inspect it if it appears), set a credential in a protected secret store, grant schema USAGE plus only column-level `SELECT(id)` on `stayhub.accounts`, and confirm no PUBLIC or inherited permissions broaden effective access. The credential must be supplied to the offline operator process without placing it in GitHub, logs or this report. The live preflight must then pass using the Staging connection, and an actual connection as the reader must demonstrate that `SELECT id` works while email/password/property/billing reads and all writes fail. No Production role should be changed for this task.
