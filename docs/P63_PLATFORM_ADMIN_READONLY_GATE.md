# P6.3 — Platform Admin identity gate and read-only membership directory

Date: 2026-11-23 (Asia/Bangkok)  
Repository: `santilab48/StayHub`, branch `feat/stayhub-p26-readiness`.

## Verdict

**Isolated CI PASS; Neon Staging schema validated; Production promotion NOT performed.** This stage builds a safe, initially empty, server-side Platform Admin registry and a read-only member search, without granting anyone Super Admin or re-enabling legacy privileged Supabase/OA routes.

## Code

- `neon/membership/002_platform_admins.sql`: additive `stayhub_membership.platform_admins` registry with Railway account UUID primary key, enabled flag, grant actor/reason and revocation field. No seeded admin. Does not modify operational tables.
- `lib/db/platform-admin.ts`: requires a valid authenticated **Railway** session identity and an independently provisioned, active, not-revoked Neon admin record. Membership plan, property Owner/Admin or browser flags cannot grant platform-admin access.
- `lib/db/membership-admin-reader.ts`: server-only reader pool with existing Neon membership-scoped read-only credentials. Never uses an admin writer.
- `app/api/v2/platform-members/route.ts`: authenticated, admin-scoped, cache-disabled, paginated and search-limited **GET only** membership directory. No POST/PATCH/DELETE or client privilege grants. Returns Railway account UUID, plan code/status, effective dates, row version; omits passwords and sessions.
- `app/platform-admin/page.tsx`: separate safe read-only directory. Anonymous visitors get sign-in, unauthorized accounts get access denied. No legacy `/platform` children are exposed; the original disabled Platform layout remains unchanged.
- `scripts/p63-platform-admin-http-e2e.mjs`: isolated two-Postgres integration proves anonymous 401, ordinary Railway account 403, no default admin, admin query access only after explicit CI fixture provision, pagination validation, no POST grant, and immediate access revocation.

## Evidence

- Build / Security: https://github.com/santilab48/StayHub/actions/runs/45160023762 — **SUCCESS**.
- Isolated Postgres HTTP / Chromium / receipt / offline / restore: https://github.com/santilab48/StayHub/actions/runs/45160023656 — **SUCCESS**, including `Test server-authorized Platform Admin membership directory and revocation`.
- Neon project `late-darkness-78944075`, **Staging only**, branch `br-fancy-sky-a1n96vul`, database `neondb`: 3 additive `002_platform_admins.sql` DDL statements applied transactionally. `stayhub_membership_reader` successfully SELECTed **0** admins. Reader remains denied access to legacy operational `stayhub.properties` with `42501`.
- No actual Platform Admin identities were provisioned. No user subscriptions created. No SQL changes made to Neon Production or Railway Production. No new Production deployment; PR #2 not merged.

## Explicit release gates

1. Before Production schema migration, verify a recoverable production snapshot and separately approved admin account provisioning. The existing Neon P6.0 membership schema remains available in Production.
2. Implement a privileged, **audited** grant/revoke workflow: explicit operator identity and reason, transactional event ledger, verified Railway account UUID, deny self-grants and initial bootstrap without two-person approval. Never use the reader credential for grants.
3. Review/approve business policy (subscription tiers, pricing, entitlements, renewal process) before enabling mutation UI. A read-only member directory does **not** mean commercial member management is finished.
4. Continue to block unverified legacy `/platform` actions. Only expose the new isolated server-guarded surface after schema/auth review.
5. Complete Railway Production Postgres backup/restore proof, authorized Production room-sync write acceptance, physical-mobile/PDF testing and rollback rehearsal separately.

This is a meaningful code/test milestone, **not full Super Admin launch or 100% cutover completion**.
