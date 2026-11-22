# StayHub V2 — One App / One Deployment

Status: **Architecture decided, implementation not production-ready**
Date: 2026-11-22

## Non-negotiable simplicity
- **One GitHub repository:** `santilab48/StayHub`.
- **One Next.js app, one deployment service, one domain:** public signup, dormitory owner dashboard, resident 6-tile menu, platform admin, internal notifications, server API routes and PWA manifest share one codebase.
- Do **not** create separate repositories, resident frontend, owner frontend, LINE OA service, push worker app, or independent API deployment.
- **One PostgreSQL database service:** keep the existing Supabase backend during migration/testing; do not move to Neon as part of this architectural change. Database is managed infrastructure, not another application deployment.
- **One private object storage backend** when contracts/slips/photos are implemented. It can be managed by Supabase; bucket permissions are mandatory.
- Keep one deployment target (existing Vercel project) initially; do not simultaneously set up Railway. A provider switch should be a separate reviewed change.
- One health endpoint `GET /api/health` for process readiness. It does not prove database availability.
- One Next.js PWA manifest `/manifest.webmanifest` through app/manifest.ts. Manifest alone does **not** enable offline runtime or Web Push.

## Single-app request flow

```
Phone / desktop browser
    |
    +---- https://<stayhub-domain> (one origin)
             |
             v
     Next.js App Router (one Vercel project)
       /                 product entry
       /start            device-first setup, later verified signup
       /workspace        local workspace overview
       /t/:slug/app      resident 6-button dashboard (to implement)
       /t/:slug/admin    owner management
       /platform         platform management
       /api/*            internal server endpoints for shared data,
                         subscription registration and notifications
       /api/health       no-secret process liveness
             |
             +-- IndexedDB in user's device for drafts/cache
             +-- Supabase PostgreSQL for authoritative shared data
             +-- Private storage for signed docs, receipts and images
             +-- Web Push provider/browser subscription integration
```

## Unified notification design (not yet implemented)
- Database records notifications with tenant, recipient, type, event id, timestamps, read state and delivery state.
- Producing an invoice, repair status change, parcel or announcement triggers one server-side notification event.
- Next.js server route/server job sends push with VAPID keys stored as **server-only environment secrets**.
- Push subscriptions are registered by authenticated users after permission is granted; each device can register separately.
- On browsers that require PWA installation (notably iOS Home Screen web apps), guide installation before requesting notification permission.
- Push is best effort: a notification must remain visible in the in-app inbox even when the device is offline.
- Do not put VAPID private keys in the browser or push private payloads without authenticated retrieval.
- For scheduled reminders or retries, prefer one protected cron endpoint in the **same** Next.js app; any scheduler is an infrastructure trigger, not another service. Add it only if necessary and supported by the hosting plan.

## Source structure (target)
```
app/
  page.tsx                 standalone entry
  start/page.tsx           device-first onboarding
  workspace/page.tsx       local workspace
  t/[tenantSlug]/
    app/                   resident dashboard & 6 tiles
    admin/                 owner dashboard
  platform/                operator dashboard
  api/
    health/route.ts        process health
    auth/                  signup/login/account recovery (planned)
    notifications/         subscriptions + events (planned)
    sync/                  authorized, idempotent server sync (planned)
lib/
  local-workspace.ts       IndexedDB device onboarding
  local-repair-drafts.ts   IndexedDB local drafts
  server-auth.ts           existing privileged layout guards
  auth/                    shared auth helpers (planned)
  db/                      server-only data access (planned)
  notifications/           push + inbox helpers (planned)
  sync/                    replay validation, dedup (planned)
public/
  icons/                   installable PWA icons (planned)
```

## Deployment recipe
1. Develop on feature branch and run GitHub Actions: structure test, static audit, TypeScript, Next build.
2. Set up a staging/preview environment in the **same Vercel project** with separate, non-production Supabase credentials.
3. Require validated environment variables; keep server secrets out of `NEXT_PUBLIC_*`.
4. Apply reviewed migrations only to staging database, check tenant A/B RLS and Storage isolation.
5. Test registration, login, local IndexedDB, dashboard permissions, multi-device sync and install/notification permissions.
6. Manually approve merge/release. Production deployment should be managed in **one** hosting integration only, not duplicate deployment actions in GitHub workflow.
7. Monitor `/api/health`, application errors, database connections and notification delivery metrics.

## Production blockers — not yet complete
- Actual server-backed account registration/recovery and membership binding.
- Resident simplified six-tile dashboard with securely connected destinations.
- Service worker and actual offline behavior, push subscription lifecycle, in-app inbox and event delivery.
- Shared-data sync, idempotency and conflicting edits.
- Real staging DB migration inventory, RLS, auth/session refresh and Storage policy tests.
- PWA icons and browser installability verification.
- Vercel auto-deployment settings outside GitHub Actions must be reviewed.

This is a **single-deploy target architecture**, not a claim that those features currently run.
No production deployment, migration or merge is authorized by this document.
