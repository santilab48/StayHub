# StayHub P6.1 — Live membership status page and safe Neon benefits

Date: 2026-11-23 (Asia/Bangkok)
Repository `santilab48/StayHub`, branch `feat/stayhub-p26-readiness`
App code commit `b7530a73fd7e89d5e65c4616b8bdd06942887765`

## Delivered and deployed

- Added `app/membership/page.tsx` for authenticated users to view their own package status, expiry, and currently active entitlements from `GET /api/v2/membership`.
- Added an entry link from the existing owner `/cloud` dashboard.
- The page handles pending, anonymous (sign-in), no package, active, expired, suspended/cancelled, and membership-service-unavailable states. No promotional or fabricated plan prices or user entitlements are displayed.
- Entitlement names use exact catalog codes since no approved Thai marketing names or plan definitions have been provided.
- No frontend UI grants benefits. Package status and expiration remain decided by the Neon-backed server endpoint. A member status never changes property-specific Owner/Tenant/Admin authorization.
- Added `scripts/p61-membership-browser-e2e.mjs`, a real isolated Chromium test of anonymous/no-package/active/suspended states. User registration is in disposable Railway stand-in PostgreSQL; privileged test catalog inserts are in a second isolated Neon stand-in PostgreSQL database. No Production customer accounts are touched.
- Extended `.github/workflows/p26-isolated-http-e2e.yml` to test this page before earlier two-context room sync, print receipt PDF, PWA persistence and DB recovery regression steps.

## Verified tests

- Build and Security: https://github.com/santilab48/StayHub/actions/runs/45152584051 — **SUCCESS**.
- Isolated HTTP + Chromium: https://github.com/santilab48/StayHub/actions/runs/45152584033 — **SUCCESS**, including membership page, multi-user benefit scoping, older room-sync, billing receipt, offline/PWA and logical DB backup restore tests.
- No new Railway migrations or changes to Railway PostgreSQL operational tables.

## Production release

- Railway Project `a8a5a434-4d18-438f-b4ea-ece072094595`, Production environment `c9c4b13a-9041-4ae6-bd50-2d02b546b053`, app service `3af8aa8a-2678-47f5-bdf2-aea4fa78c17a`.
- Staged/committed **one** non-destructive setting: service source commit SHA changed from `b57fe3da3ee1cd3de1e977ff7b0e85b5382953c7` to `b7530a73fd7e89d5e65c4616b8bdd06942887765`. No secrets, DB variables, volumes or schema modified.
- New deployment `d0b79982-9fe0-4703-a2c4-1cc64329fae8`: **SUCCESS**. Build compiled, pre-deploy checks verified existing Railway DB and skip migration ledger 001–014, and Railway platform healthcheck returned `[1/1] Healthcheck succeeded!`.
- Final management verification: StayHub app and PostgreSQL `Postgres-PDqf` **Online 1/1 each**, zero critical issues, zero warnings.
- Previous successful app deployment `7bc21577-726f-43e2-9ea3-748996a6ace3` remains rollback reference.
- Live URL: `https://stayhub-production-ac298aeb.up.railway.app/membership`.

## Unresolved scope — do not claim full commercial membership launch

- Neon Production `stayhub_membership.plans` and `memberships` are currently empty; no actual package pricing/tiers, benefit catalog, customer subscription grants or historical account-mapping has been approved.
- Owner-only or platform-wide membership administration, secure platform-admin onboarding and a subscription payment/renewal workflow have not been implemented.
- A real Production authenticated user session reading membership data end-to-end has not been exercised; CI proves the behavior against two isolated databases, and the platform healthcheck tests Railway DB rather than an authenticated Neon membership read.
- The original P5.10 missing Production PostgreSQL off-site backup/restore verification and authorized Production room write E2E remain open.
- Existing production Neon old-schema account data is preserved; this new membership module does not automatically migrate it into Railway identities or generate entitlement records.

**Next controlled step:** approve actual package/catalog definitions and explicit authorized account mapping, then implement admin workflow with separate audited write identity and no self-service privilege escalation. Do not auto-assign Premium.
