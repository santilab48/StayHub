# StayHub P1.3 — Server-side authorization changes

Date: 2026-11-22

## Implemented
- `/platform/**` server layout verifies Supabase `auth.getUser()` and active `platform_admins` row before rendering.
- `/t/[tenantSlug]/admin/**` server layout verifies the authenticated profile role, matching tenant slug and `current_tenant_active` RPC, failing closed when queries fail.
- Existing browser guards stay in place for user-facing transitions.
- Added SQL **read-only staging audit**: `supabase/audits/p1_3_readonly.sql`.

## Boundaries / not yet verified
- Server layout protections are **not a substitute for database RLS** or storage object access policies; browser Supabase requests still connect directly to the data API.
- Authentication/tenant isolation was **not tested live**, because no staging Supabase credentials or dedicated test users have been provided to this environment.
- `getServerAuthClient` reads the Supabase Auth cookies but cannot persist refreshed cookies from a Server Component. Add a carefully tested refresh proxy or middleware before public launch if necessary.
- Build CI uses placeholder configuration; a green build is **not** evidence of successful login.
- The bundled schema still lacks definitions referenced by the actual app. Do not run it against production.
- GitHub workflow no longer deploys production, but Vercel Git integrations may still deploy previews automatically. Check project-level protection settings.

## Staging validation sequence
1. Run read-only SQL in a separate staging database. Manually review table grants, policies, function privileges and Storage buckets.
2. Create separate test identities: platform admin, tenant A owner, tenant B owner, tenant A resident and tenant B resident.
3. Verify server redirects for anonymous /platform and admin URLs; verify authenticated roles.
4. Test unauthorized Supabase API selects, updates, inserts, upserts, deletes and Storage URL access across tenant boundaries using test identities.
5. Test login, session expiration and refreshed cookies in staging after deploy.
6. Only then prepare a separate, reviewed database migration if any finding is confirmed.

Do not merge/deploy production without explicit user approval.
