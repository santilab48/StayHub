# StayHub Architecture V2 — Local-First Multi-Tenant + LINE OA

Status: **Architecture baseline finalized; runtime rollout requires staging verification**
Last revised: 2026-11-22
Repository: `santilab48/StayHub`
PR: #1, feature branch `feat/stayhub-p1-security-staging-audit`

## 1. Product boundary

StayHub is a multi-tenant dormitory system with distinct platform owner, dormitory owner/staff and resident roles. Each dormitory may have a separate LINE OA; a LINE OA/LIFF identity is NOT sufficient authorization by itself. RecycleBill-style local-first storage is adopted for user-device drafts and preferences. Shared records must still be synchronized and permission checked.

## 2. Domain modules / authority

| Domain | Owner of truth | Device-side | Entry route | Isolation |
| --- | --- | --- | --- | --- |
| App preferences and unsent form drafts | IndexedDB | Read/write offline | relevant form | per user and tenant |
| Platform owner / subscription / OA mapping | Server | no sensitive persistent cache | /platform | platform-only, separate permissions |
| Dormitory/rooms/occupancy | Server | read-only authorized cache planned | /t/:slug/admin/rooms | tenant + assigned resident |
| Contracts/signatures | Server with private storage | no unencrypted local signatures | /t/:slug/admin/contracts | tenant + participants |
| Meter readings and bills | Server after submission/publication | unsigned draft planned | /t/:slug/admin/meters /admin/finance | tenant + room |
| Payments/receipts | Server authoritative | read-only masked copy planned | /t/:slug/app/billing | tenant + bill recipient |
| Maintenance | Server after submit | **text draft IndexedDB implemented** | /t/:slug/app/repair | tenant + lease/profile |
| Parcels/announcements | Server | read-only cache planned | /t/:slug/app/services /app/news | tenant + recipient |
| LINE OA/LIFF integration | Trusted server configuration | no local tokens | /t/:slug/menu/:action | verified OA → tenant mapping |

## 3. Authentication & roles

- Supabase Auth user is verified by server-side `getUser()`.
- A user is associated to a tenant by authorized `profiles` data, not by accepting an arbitrary URL slug as proof of access.
- Platform operator → `platform_admins`; owner/staff → tenant-scoped `profiles.role`; resident → tenant-scoped profile and room/lease relationship.
- The browser UI route guard is for UX only. Real Supabase table reads/writes, RPCs and Storage paths must be protected by RLS and server validation.
- Tenant isolation negative tests: tenant A credentials cannot read/update/create against tenant B; resident A cannot access room B in the same tenant; unauthenticated requests are denied.
- Separate staging credentials/test identities required before describing this as a completed security rollout.

## 4. Local database structure

`lib/local-repair-drafts.ts` implements `stayhub-local-v1` IndexedDB, object store `drafts`. Keys are JSON tuples `[tenantId,userId,kind]` to avoid collisions. Maintenance drafts persist only category, text description, and updated timestamp.

**Local-first implementation contract for upcoming modules:**
- Drafts: local first. Persist small, non-sensitive text while editing; restore on page return; clear only after the authoritative server confirms submission.
- Final submissions: use server assigned/validated ownership and idempotency keys before adding retry queues; never mark paid or signed solely because an offline action was queued.
- Sync queue future schema: `{id, tenantId, userId, operation, payloadVersion, createdAt, attemptCount, nextAttemptAt, idempotencyKey, state}`; enforce server-side auth on replay.
- Conflict policy: local draft has latest local editing state; server wins for approved invoices, payment status, member roles, signed contracts and completed repair state transitions.
- Device data recovery: offer explicit export/backup for allowed draft fields and clear data on account change/logout; clarify browser storage deletion can remove unsynced edits.
- No tokens, slips, IDs, signatures or private attachments in unencrypted IndexedDB.

## 5. Navigation and Rich Menu routing

- Route allowlist: `lib/rich-menu-routes.ts`; entry: `/t/:tenantSlug/menu/:action`.
- Six resident actions: room, billing, repair, parcels, news and contact. Also `home`.
- Six admin actions: admin, admin_billing, admin_repairs, admin_rooms, admin_parcels and admin_news.
- No direct platform owner Rich Menu: platform remains under `/platform`.
- Unknown action/invalid slug returns 404; valid actions redirect to an internal route, not any caller-provided URL.
- The external Rich Menu URL must use the trusted slug associated with each OA, and verified host.
- Parcel and contact resident entries currently open services page: these are provisional and not dedicated functionality yet.
- LINE OA creation, menu assignment, LIFF onboarding, session refresh and callback validation remain implementation gates.

## 6. Source layout

```
app/
  platform/                platform operator UI + server gate
  t/[tenantSlug]/
    admin/                 dormitory owner/staff UI + server gate
    app/                   resident UI
    menu/[action]/         LINE Rich Menu allowlisted internal redirect
components/
  AdminAuthGate.tsx         supplementary UI check
  PlatformAuthGate.tsx      supplementary UI check
  ResidentRepairCenter.tsx  local draft + server submission
lib/
  routes.ts                canonical app paths
  rich-menu-routes.ts      LINE action allowlist
  server-auth.ts           privileged server layout gates
  supabase-browser.ts      public browser Supabase client
  local-repair-drafts.ts   IndexedDB draft adapter
supabase/
  schema.sql               incomplete legacy snapshot; NOT authoritative
  audits/p1_3_readonly.sql read-only staging security inventory
docs/
  ADR_001_LOCAL_FIRST_STORAGE.md
  LINE_RICH_MENU_ROUTING.md
  P1_2_STAGING_VERIFICATION.md
  P1_3_AUTHORIZATION.md
  ARCHITECTURE_V2.md
```

## 7. Deployment and release boundaries

- GitHub feature branch → Draft PR → static audit/TypeScript/Build CI → staging evaluation.
- Review Vercel Git integration's preview/production settings separately from GitHub workflow.
- Keep Production database and LINE OA untouched until the user explicitly authorizes deployment.
- Do not apply bundled `supabase/schema.sql`: it does not define all database objects referenced by the existing application.
- No live database credentials have been provided for staging tests; do not claim end-to-end safety or offline PWA completion.

## 8. Definition of done

**Structure baseline:** canonical roles and data ownership, tenant-scoped URLs, allowlisted Rich Menu action router, IndexedDB-based device drafts, PR with compile checks and documented isolation test cases.

**Production ready (NOT yet achieved):** staging user/auth/RLS/Storage isolation verified; proper LINE login binding and return path; sync/retry conflict tests; PWA offline startup; signed contracts/payment flows; backup/restore; operational alerting; production release approval.
