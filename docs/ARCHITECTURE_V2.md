# StayHub Architecture V2 — Standalone Local-First (NO LINE OA)

Status: Architecture refactored; real multi-device account signup and cross-user sync **pending**.
Date: 2026-11-22.

## Product decision (supersedes prior LINE OA architecture)
Users visit StayHub's website directly. They can start a device-only local workspace immediately; a future verified account-signup step will connect that workspace to shared cloud facilities. LINE OA, LIFF and Rich Menu are **not dependencies and are removed from the new navigation plan**.

## Routes
- `/`: Standalone product landing with Start and My Workspace actions.
- `/start`: device-first onboarding form (owner name and dormitory name).
- `/workspace`: local workspace overview, not a cloud-registered account or production dorm admin.
- Existing `/t/:slug/app`, `/t/:slug/admin`, `/platform`: legacy shared-data application routes; they require proper auth, permissions, verified backend migrations and staged transition before onboarding can grant access.
- Old `/t/:slug/menu/:action` LINE route is discontinued and deleted from this feature branch.

## Storage and authority
- `stayhub-device-v1` IndexedDB stores local workspace identity and basic device settings. No personal-ID documents or payments should be stored in this unencrypted store.
- `stayhub-local-v1` IndexedDB stores scoped repair form text drafts for authenticated tenant users.
- Shared rooms, residents, bills, payment confirmations, legal contracts and membership roles **remain server-authoritative**; users must not treat offline records as approved payments or signed contracts.
- Production will require account registration/authentication, role assignment, multi-tenant RLS/permissions, storage policies and safely replayed syncing with idempotency keys.
- Local data can disappear when clearing the browser. Do not claim backup/recovery or cross-device sync is complete.

## Critical lifecycle
1. Visitor opens `/`.
2. Visitor creates a **device-only workspace** at `/start`, persisted via IndexedDB.
3. Browser opens `/workspace`.
4. When backend signup is implemented, user registers/verifies an account and explicitly claims/imports local workspace. This step is **not implemented**; do not silently create a tenant using a client-supplied role.
5. Verified owners can create rooms and invite residents only through permission-checked server operations. Offline drafts can later be queued with idempotency.

## Code layout
- `app/page.tsx` website entry
- `app/start/page.tsx` device onboarding
- `app/workspace/page.tsx` device overview
- `lib/local-workspace.ts` versioned IndexedDB adapter
- `lib/local-repair-drafts.ts` scoped repair draft store
- `lib/server-auth.ts` legacy backend role gates
- `scripts/verify-structure.mjs` no-LINE and standalone routing checks
- `docs/ADR_001_LOCAL_FIRST_STORAGE.md` local-first storage policy
- `supabase/audits/p1_3_readonly.sql` staging security inspection

## Work remaining for full RecycleBill-style onboarding
- Decide secure account registration and billing/subscription lifecycle.
- Implement verified email/password or another web-first auth flow on server, with durable membership identifier and recovery.
- Implement `workspace claim` as atomic operation that attaches device workspace to authenticated owner/tenant only after server validation; protect duplicate claims.
- Build standalone usable room/tenant/bill workflows, offline queue + backup/export and storage failure handling.
- Migrate legacy OA wording and schema naming incrementally. Do not drop production columns before reviewed migrations.
- Run staging tests for login, RLS, tenant A/B and resident isolation, account switching, device loss, conflict handling and payment reconciliation.
- Verify Vercel Git integration preview deployment behavior separately from GitHub Actions.

## Release guard
This is not production signup. Do not merge, deploy production, mutate real DB or provision accounts until code/tests are verified and deployment is explicitly authorized.
