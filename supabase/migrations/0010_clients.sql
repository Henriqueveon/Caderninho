-- =========================
-- CADERNINHO — Cadastro de clientes (mini-CRM)
-- Cliente = contato do estúdio (com ou sem login). Atendimentos ligam a ela
-- para dar noção de recorrência, nº de visitas e taxa de presença.
-- =========================

create table clients (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id),
  profile_id uuid references profiles(id), -- vincula se a cliente tiver login
  full_name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);
create index idx_clients_studio on clients (studio_id);

-- atendimento aponta para a ficha da cliente (mantém o snapshot do nome)
alter table appointments
  add column client_record_id uuid references clients(id) on delete set null;
create index idx_appt_client_record on appointments (client_record_id);

-- RLS: staff lê; owner/secretária gerenciam
alter table clients enable row level security;
create policy clients_select on clients for select
  using (studio_id = auth_studio_id()
    and auth_role() in ('owner','secretary','professional'));
create policy clients_write on clients for all
  using (studio_id = auth_studio_id() and auth_role() in ('owner','secretary'))
  with check (studio_id = auth_studio_id() and auth_role() in ('owner','secretary'));

-- book_appointment passa a aceitar a ficha da cliente
drop function if exists book_appointment(uuid, uuid, timestamptz, uuid, text, text);

create or replace function book_appointment(
  p_professional_id uuid,
  p_service_id uuid,
  p_scheduled_start timestamptz,
  p_client_id uuid default null,
  p_client_name text default null,
  p_notes text default null,
  p_client_record_id uuid default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_studio uuid := auth_studio_id();
  v_role text := auth_role();
  v_service services%rowtype;
  v_prof professionals%rowtype;
  v_ps_price numeric(10,2);
  v_ps_dur int;
  v_price numeric(10,2);
  v_duration int;
  v_pct numeric(5,2);
  v_end timestamptz;
  v_client_id uuid := p_client_id;
  v_client_name text := p_client_name;
  v_status text;
  v_appt_id uuid;
begin
  if v_studio is null then raise exception 'Não autenticado'; end if;

  select * into v_service from services
  where id = p_service_id and studio_id = v_studio and active;
  if not found then raise exception 'Serviço inválido'; end if;

  select * into v_prof from professionals
  where id = p_professional_id and studio_id = v_studio and active;
  if not found then raise exception 'Profissional inválida'; end if;

  if v_role = 'client' then
    v_client_id := auth.uid();
    v_status := 'scheduled';
  elsif v_role = 'professional' then
    if v_prof.profile_id <> auth.uid() then
      raise exception 'Profissional só agenda na própria agenda';
    end if;
    v_status := 'confirmed';
  elsif v_role in ('owner','secretary') then
    v_status := 'confirmed';
  else
    raise exception 'Sem permissão para agendar';
  end if;

  -- nome congelado: ficha da cliente > texto avulso > perfil logado
  if p_client_record_id is not null then
    select full_name into v_client_name from clients
    where id = p_client_record_id and studio_id = v_studio;
  elsif v_client_name is null and v_client_id is not null then
    select full_name into v_client_name from profiles where id = v_client_id;
  end if;

  select price, duration_minutes into v_ps_price, v_ps_dur
  from professional_services
  where professional_id = p_professional_id and service_id = p_service_id;

  v_price := coalesce(v_ps_price, v_service.price);
  v_duration := coalesce(v_ps_dur, v_service.duration_minutes);
  v_pct := coalesce(v_service.commission_pct_override, v_prof.commission_pct);
  v_end := p_scheduled_start + make_interval(mins => v_duration);

  if exists (
    select 1 from appointments
    where professional_id = p_professional_id
      and status in ('scheduled','confirmed','in_progress')
      and scheduled_start < v_end and scheduled_end > p_scheduled_start
  ) then
    raise exception 'Horário indisponível para esta profissional';
  end if;

  insert into appointments (
    studio_id, professional_id, client_id, client_record_id, client_name_snapshot,
    service_id, price_snapshot, commission_pct_snapshot,
    scheduled_start, scheduled_end, status, notes, created_by
  ) values (
    v_studio, p_professional_id, v_client_id, p_client_record_id, v_client_name,
    p_service_id, v_price, v_pct,
    p_scheduled_start, v_end, v_status, p_notes, auth.uid()
  ) returning id into v_appt_id;

  return v_appt_id;
end $$;
revoke execute on function book_appointment(uuid, uuid, timestamptz, uuid, text, text, uuid) from public, anon;
grant execute on function book_appointment(uuid, uuid, timestamptz, uuid, text, text, uuid) to authenticated;

-- Lista de clientes com estatísticas (owner/secretária)
create or replace function get_clients_with_stats()
returns table (
  id uuid, full_name text, phone text, email text, notes text, created_at timestamptz,
  total int, done int, no_show int, canceled int, upcoming int, last_visit timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth_role() not in ('owner','secretary') then
    raise exception 'Apenas a gestão pode ver a lista de clientes';
  end if;
  return query
    select c.id, c.full_name, c.phone, c.email, c.notes, c.created_at,
      count(a.*)::int,
      count(a.*) filter (where a.status = 'done')::int,
      count(a.*) filter (where a.status = 'no_show')::int,
      count(a.*) filter (where a.status = 'canceled')::int,
      count(a.*) filter (where a.status in ('scheduled','confirmed')
        and a.scheduled_start >= now())::int,
      max(a.scheduled_start) filter (where a.status = 'done')
    from clients c
    left join appointments a on a.client_record_id = c.id
    where c.studio_id = auth_studio_id()
    group by c.id
    order by c.full_name;
end $$;
revoke execute on function get_clients_with_stats() from public, anon;
grant execute on function get_clients_with_stats() to authenticated;
