# StayHub P1.2 — Staging and tenant-isolation verification

Date: 2026-11-22. Branch: `feat/stayhub-p1-security-staging-audit`.

## Confirmed from the source snapshot
- The bundled SQL schema is incomplete relative to client table/RPC references.
- An absent RLS statement in the bundled schema is NOT proof RLS is disabled in deployed Supabase.
- CI is configured to use a deliberately non-routable Supabase URL for compile checks and performs no deployment.
- Client-side role gates are not security boundaries.
- No live staging database or authentication credentials have been connected/verified as part of this change.

## Staging prerequisites
1. Use a dedicated Supabase staging project and staging-only test users. Do not use production credentials or copy real customer personal data.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy anon key) in staging deployment settings, not the repository.
3. Review full staging schema/migrations, role grants, RLS policies and Storage policies BEFORE applying any SQL.
4. Ensure external Vercel Git integrations do not promote feature branches to production automatically.
5. Trigger CI and verify audit, typecheck, and build jobs.

## Read-only SQL checks (run only against staging)
```sql
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname='public'
order by tablename, policyname;

select routine_schema, routine_name, security_type
from information_schema.routines where routine_schema='public'
order by routine_name;

select id, name, public from storage.buckets order by name;
```

## Manual integration test matrix (use staging only)
- Owner A can read/write own permitted records; cannot read/write Tenant B records by specifying B UUID.
- Owner B cannot access Tenant A.
- Resident A can access only their own room, bill, payment proof, repair and contract; not another resident's data in Tenant A.
- Unauthenticated requests cannot access protected resources.
- Storage: resident/owner cannot retrieve or overwrite another resident's documents by guessed file path.
- Cross-tenant `insert` / `update` attempts must fail; tenant_id cannot be changed into another tenant.
- Privileged RPCs enforce authorization server side; test for forged tenant identifiers and role changes.

## Release gate
Do not merge/deploy until missing SQL dependencies are reconciled against real migrations, tests above pass, and CI succeeds. This PR does NOT install migrations, change a live database, or claim RLS verification.
