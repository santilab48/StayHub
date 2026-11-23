# StayHub P5.6 — Owner, Tenant, Property Admin and Platform Admin access review

Date: 2026-11-23 (Asia/Bangkok)

## Scope and status

**PARTIAL PASS.** Owner, Tenant, property-scoped Admin and Staff access-control regression passed using an isolated CI PostgreSQL database; real Chromium two-context room sync remains passing. **Platform Super Admin is NOT enabled or verified**: the current `app/platform/layout.tsx` deliberately renders a disabled-platform notice rather than a privileged admin workspace. No platform-admin provisioning/authentication implementation was developed in P5.6. This is a known product-level limitation, not a passing Platform Admin E2E.

No UI/UX, business services, Production data, Railway variables, deployments or DB migrations were changed. All test account and role writes were restricted to disposable localhost CI PostgreSQL.

## Repository and modifications

- Repo `santilab48/StayHub`, branch `feat/stayhub-p26-readiness`.
- New test commits: `7ac7ff4eb8971d6fa2f68e202dcadab7b844f68e` and `16f1a4a585d6ec65bb26f00a4b69e6697d95bad6`.
- Extended `scripts/p26-http-e2e.mjs`, which has explicit `CI=true`, `P26_E2E_BASE=http://127.0.0.1:3000` and localhost-only guard. Admin/Staff fixture additionally verifies `DATABASE_URL` hostname `127.0.0.1` and the exact disposable `/stayhub_p26_ci` database name.
- Tenant with an approved stay cannot list Owner's units, invites, residents, occupancy or join requests; cannot create rooms/invites, or read/write protected room Sync.
- A property `admin` role granted in the isolated DB can access allowed property-specific room list, join requests and Sync read/write.
- A `staff` role cannot use the Owner/Admin-only room and join request management APIs or the protected room Sync route.
- Existing Owner account still accesses its property, approves invitations and controls leases/bills under previous isolated integration coverage.
- No test attempts to create a Platform Super Admin or seed privileged global-platform credentials.

## Evidence — actual GitHub Actions execution

Commit `16f1a4a585d6ec65bb26f00a4b69e6697d95bad6`:

- Build and Security workflow, GitHub Actions run `45138697836`: **SUCCESS**, including Next.js build and type checking.
- Isolated PostgreSQL HTTP + Chromium workflow, run `45138697621`, job `137571157937`: **SUCCESS**. The runner applied migration 014 in its disposable database and passed HTTP auth, QR, billing and access controls.
- Observed HTTP results in job logs include:
  - `PASS tenant denied owner unit list 403`
  - `PASS tenant cannot create rooms 403`
  - `PASS tenant cannot pull owner room sync 403`
  - `PASS tenant cannot push owner room sync 403`
  - `PASS tenant cannot confirm payment 403`
  - `PASS property admin can list rooms 200`
  - `PASS property admin can review join requests 200`
  - `PASS property admin can pull rooms 200`
  - `PASS property admin can sync room 200`
  - `PASS staff cannot use owner-only room API 403`
  - `PASS staff cannot pull owner sync 403`
  - `PASS staff cannot push owner sync 403`
  - `PASS P2.6 isolated Auth/QR/Billing/permission HTTP E2E`
  - `PASS P5.3 real Chromium two-context / isolated PostgreSQL E2E`

Actions:
- https://github.com/santilab48/StayHub/actions/runs/45138697836
- https://github.com/santilab48/StayHub/actions/runs/45138697621

## Platform Admin and legacy boundaries

- `app/platform/layout.tsx` deliberately renders `การจัดการแพลตฟอร์มยังไม่เปิดใช้งาน` and a Cloud link. It does not authorize global privileged operations; the legacy dashboard's presence in source does **not** mean Platform Admin works.
- `app/t/[tenantSlug]/admin/layout.tsx` redirects legacy Supabase admin screens to `/cloud`; `app/t/[tenantSlug]/app/layout.tsx` redirects legacy resident screens to `/my`.
- The secure Platform Super Admin system would require an explicit separate architecture and scoped authorization/provisioning/audit design, tests and rollout. **Do not enable the old prototype merely to make P5.6 green**.

## Production and outstanding verification

- Production release remains pinned to `d163b4d167f8686e8015c8797d5eb0bdcc635c17`, active Railway deployment last verified `173c27ab-cd5a-4e04-a611-a6c8c1cf42f5`.
- P5.6 contains **test-only changes** after that application commit, and **was not deployed**.
- No authorized real Production role matrix / account-write E2E was performed; the tests were on disposable CI PostgreSQL.
- **P5.6 cannot be marked fully complete across Owner / Tenant / Platform Admin** until Platform Super Admin is designed and implemented. Owner/Tenant/property-admin role regression is PASS within the isolated test scope.

Next functional audits: P5.7 billing/meter/payment/PDF; P5.8 offline/PWA; P5.9 recovery/security; P5.10 final readiness. Track Platform Admin implementation as a distinct open requirement instead of assuming it is ready.
