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
