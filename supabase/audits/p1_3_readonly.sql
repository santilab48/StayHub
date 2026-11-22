-- P1.3 READ-ONLY checks. Run exclusively on a dedicated Staging Supabase project.
-- No DDL/DML, no mutations, no production credentials.
-- Results need human review; these queries do not prove isolation by themselves.

-- Inventory tables missing or with disabled RLS.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls,
       case when not c.relrowsecurity then 'REVIEW: RLS disabled'
            else 'RLS enabled (review policies)' end as finding
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
order by c.relname;

-- Inspect policy roles, permitted commands and USING/WITH CHECK clauses.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname='public'
order by tablename, policyname;

-- Routines that run with definer privileges warrant special review.
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer, p.proconfig as config
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' order by p.proname;

-- Inspect access grants on public schema tables.
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public'
order by table_name, grantee, privilege_type;

-- Cross-tenant foreign keys that only reference an id, not (tenant_id,id),
-- require additional authorization/consistency review.
select c.conrelid::regclass as child_table, c.conname as constraint_name,
       pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.contype='f' and c.connamespace='public'::regnamespace
order by 1,2;

-- Storage buckets and their policy definitions.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets order by id;
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname='storage' and tablename='objects'
order by policyname;
