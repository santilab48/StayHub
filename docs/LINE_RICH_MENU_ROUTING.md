# StayHub — LINE Rich Menu navigation contract

Status: **Routing implemented; LINE OA provisioning and LIFF auth integration NOT implemented.**

## Link format

Use `https://<verified-stayhub-host>/t/<tenantSlug>/menu/<action>`.

- A tenant's OA must use that tenant's **configured, trusted slug**. Never derive tenantSlug from unauthenticated LINE profile data.
- URLs are allowlisted by `lib/rich-menu-routes.ts`; unknown actions/slugs return 404.
- A redirect is **not authentication**. Destinations must verify their own session, tenant access, and role; all Supabase reads/writes require correctly configured RLS.
- After successful LINE Login/LIFF authentication, preserve only an allowlisted action as a return destination (avoid open redirects).
- Do not store LINE tokens in IndexedDB or attach credentials to navigation query strings.

## Resident menu (six cells)

| Cell | Action | Existing destination | Status |
| --- | --- | --- | --- |
| ห้องของฉัน | room | /t/:slug/app/room | Existing |
| บิลและชำระเงิน | billing | /t/:slug/app/billing | Existing |
| แจ้งซ่อม | repair | /t/:slug/app/repair | Existing |
| พัสดุ | parcels | /t/:slug/app/services | Temporary: dedicated parcel view missing |
| ข่าวประกาศ | news | /t/:slug/app/news | Existing |
| ติดต่อหอพัก | contact | /t/:slug/app/services | Temporary: verified contact UI missing |

Additional resident action: `home` → `/t/:slug/app`.

## Owner/Admin menu

| Action | Destination |
| --- | --- |
| admin | /t/:slug/admin |
| admin_billing | /t/:slug/admin/finance |
| admin_repairs | /t/:slug/admin/repairs |
| admin_rooms | /t/:slug/admin/rooms |
| admin_parcels | /t/:slug/admin/parcels |
| admin_news | /t/:slug/admin/news |

Owner links must be shown only to owner/admin accounts **after server-side authorization**. Platform admins use their dedicated `/platform` dashboard and do not share this tenant menu.

## Outstanding integration

1. Create LINE Rich Menu assets and per-OA URI actions only after the final host and individual OA configuration are verified.
2. Build and verify LINE Login/LIFF identity binding to the correct StayHub tenant and user.
3. Ensure every resident destination is authenticated and tenant scoped before a public rollout; some existing pages may currently render without a secure data gate.
4. Implement dedicated parcel and contact screens, replacing temporary service-page targets.
5. Test tenant A/B access, resident/owner permissions, expired memberships, invalid actions, missing sessions, mobile LINE browser and ordinary browsers.
6. Production LINE Rich Menu assignment is **not performed** by these changes.

## Local-first compatibility

Use IndexedDB for drafts and display preferences; the current authoritative bill/payment and cross-user data must be verified via permitted server reads. Rich Menu URL routing should not depend on local browser state because each LINE webview may have a separate storage partition.
