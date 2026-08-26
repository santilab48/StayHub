create extension if not exists pgcrypto;

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  line_oa_id text unique,
  status text not null default 'active',
  created_at timestamptz default now()
);

create table buildings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  room_no text not null,
  monthly_rent numeric(12,2) default 0,
  status text not null default 'vacant',
  unique(tenant_id, room_no)
);

create table users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  line_user_id text not null,
  display_name text,
  role text not null default 'tenant',
  unique(tenant_id, line_user_id)
);

create table occupancies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  starts_on date,
  ends_on date,
  active boolean default true
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'draft',
  version int not null default 1,
  signed_at timestamptz,
  signature_path text,
  pdf_path text,
  created_at timestamptz default now()
);

create table meter_readings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  meter_type text not null check (meter_type in ('water','electric')),
  previous_value numeric(12,2),
  current_value numeric(12,2) not null,
  captured_value numeric(12,2),
  photo_path text,
  verified_by uuid references users(id),
  verified_at timestamptz,
  reading_date date not null default current_date
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  billing_month date not null,
  rent numeric(12,2) default 0,
  water numeric(12,2) default 0,
  electricity numeric(12,2) default 0,
  other numeric(12,2) default 0,
  total numeric(12,2) default 0,
  status text not null default 'unpaid',
  due_date date,
  unique(tenant_id, room_id, billing_month)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  bill_id uuid not null references bills(id) on delete cascade,
  amount numeric(12,2) not null,
  slip_path text,
  status text not null default 'pending',
  paid_at timestamptz default now()
);

create table repair_tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  category text not null,
  detail text,
  photo_path text,
  preferred_time text,
  status text not null default 'received',
  created_at timestamptz default now()
);

create table parcels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  carrier text,
  photo_path text,
  status text not null default 'waiting',
  arrived_at timestamptz default now(),
  received_at timestamptz
);

create table ride_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  room_id uuid references rooms(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  provider text not null,
  pickup text,
  destination text,
  scheduled_at timestamptz,
  status text not null default 'requested'
);

create table announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  body text,
  audience text not null default 'all',
  published_at timestamptz default now()
);
