-- =========================
-- CADERNINHO — Schema inicial
-- Multi-tenant desde o dia 1: toda tabela carrega studio_id.
-- =========================

-- TENANT
create table studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  phone text,
  address text,
  settings jsonb default '{}',
  created_at timestamptz default now()
);

-- USUÁRIOS E PERFIS (auth.users é gerenciado pelo Supabase Auth)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  studio_id uuid not null references studios(id),
  role text not null check (role in ('owner','professional','client')),
  full_name text not null,
  phone text,
  avatar_url text,
  active boolean default true,
  created_at timestamptz default now()
);

create table professionals (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id),
  profile_id uuid not null references profiles(id) unique,
  commission_pct numeric(5,2) not null default 50.00,
  bio text,
  color text default '#8B5CF6',
  active boolean default true,
  created_at timestamptz default now()
);

-- CATÁLOGO DE SERVIÇOS
create table services (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id),
  name text not null,
  price numeric(10,2) not null,
  duration_minutes int not null,
  commission_pct_override numeric(5,2),
  active boolean default true,
  created_at timestamptz default now()
);

create table professional_services (
  professional_id uuid references professionals(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  primary key (professional_id, service_id)
);

-- AGENDA
create table availability_rules (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id),
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now(),
  check (start_time < end_time)
);

create table availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id),
  professional_id uuid not null references professionals(id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  type text not null check (type in ('block','extra')),
  reason text,
  created_at timestamptz default now()
);

-- ATENDIMENTOS (núcleo do sistema)
create table appointments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id),
  professional_id uuid not null references professionals(id),
  client_id uuid references profiles(id),
  client_name_snapshot text,
  service_id uuid not null references services(id),
  price_snapshot numeric(10,2) not null,
  commission_pct_snapshot numeric(5,2) not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  actual_start timestamptz,
  actual_end timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled','confirmed','in_progress','done','no_show','canceled')),
  canceled_by text check (canceled_by in ('client','professional','owner')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index idx_appt_prof_date on appointments (professional_id, scheduled_start);
create index idx_appt_studio_date on appointments (studio_id, scheduled_start);
create index idx_appt_client on appointments (client_id);

-- FINANCEIRO / COMISSÕES
create table earnings (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id),
  professional_id uuid not null references professionals(id),
  appointment_id uuid not null references appointments(id) unique,
  gross_value numeric(10,2) not null,
  commission_value numeric(10,2) not null,
  studio_value numeric(10,2) not null,
  earned_at timestamptz not null,
  created_at timestamptz default now()
);
create index idx_earnings_prof_date on earnings (professional_id, earned_at);
create index idx_earnings_studio_date on earnings (studio_id, earned_at);

create table goals (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id),
  professional_id uuid not null references professionals(id),
  month date not null,
  target_type text not null check (target_type in ('revenue','appointments')),
  target_value numeric(10,2) not null,
  bonus_type text not null check (bonus_type in ('fixed','extra_pct')),
  bonus_value numeric(10,2) not null,
  created_at timestamptz default now(),
  unique (professional_id, month, target_type)
);

create table bonuses (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id),
  professional_id uuid not null references professionals(id),
  goal_id uuid references goals(id),
  month date not null,
  value numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','paid')),
  created_at timestamptz default now()
);

-- CONVITES DE PROFISSIONAL (gestora gera link com token)
create table invites (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id),
  token uuid unique not null default gen_random_uuid(),
  email text not null,
  full_name text,
  commission_pct numeric(5,2) not null default 50.00,
  accepted_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- AUDITORIA / HISTÓRICO DE AÇÕES
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
create index idx_log_studio_date on activity_log (studio_id, created_at desc);
