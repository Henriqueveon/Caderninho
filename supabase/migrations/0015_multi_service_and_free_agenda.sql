-- =========================
-- CADERNINHO — Múltiplos serviços por atendimento + agenda livre
-- 1) appointment_items: um atendimento pode ter 1+ serviços (soma preço/duração).
--    price_snapshot/commission_pct_snapshot do atendimento passam a ser o TOTAL
--    (comissão = pct efetivo combinado), mantendo o motor de earnings intacto.
-- 2) Agenda livre: book/edit_appointment NÃO checam mais conflito de horário —
--    as consultoras encaixam a cliente onde acharem melhor.
-- =========================

-- ---- 1. Itens do atendimento ----
create table if not exists appointment_items (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  name_snapshot text not null,
  price numeric(10,2) not null,
  duration_minutes int not null default 0,
  created_at timestamptz default now()
);
create index if not exists idx_appt_items_appt on appointment_items (appointment_id);

alter table appointment_items enable row level security;
-- leitura acompanha a visibilidade do atendimento pai; escrita só via RPC (security definer)
drop policy if exists appt_items_select on appointment_items;
create policy appt_items_select on appointment_items for select using (
  exists (
    select 1 from appointments a
    where a.id = appointment_id
      and a.studio_id = auth_studio_id()
      and (
        auth_role() in ('owner','secretary')
        or a.professional_id = auth_professional_id()
        or a.client_id = auth.uid()
      )
  )
);

-- backfill: todo atendimento existente vira 1 item (o serviço atual)
insert into appointment_items (appointment_id, service_id, name_snapshot, price, duration_minutes)
select a.id, a.service_id, coalesce(s.name, 'Serviço'), a.price_snapshot, coalesce(s.duration_minutes, 0)
from appointments a
left join services s on s.id = a.service_id
where not exists (select 1 from appointment_items ai where ai.appointment_id = a.id);

-- ---- 2. book_appointment: array de serviços, sem conflito ----
drop function if exists book_appointment(uuid, uuid, timestamptz, uuid, text, text, uuid);

create or replace function book_appointment(
  p_professional_id uuid,
  p_service_id uuid,
  p_scheduled_start timestamptz,
  p_client_id uuid default null,
  p_client_name text default null,
  p_notes text default null,
  p_client_record_id uuid default null,
  p_service_ids uuid[] default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_studio uuid := auth_studio_id();
  v_role text := auth_role();
  v_prof professionals%rowtype;
  v_service services%rowtype;
  v_ids uuid[] := coalesce(p_service_ids, array[p_service_id]);
  v_sid uuid;
  v_ps_price numeric(10,2); v_ps_dur int;
  v_price numeric(10,2); v_duration int; v_pct numeric(5,2);
  v_names text[] := '{}'; v_prices numeric(10,2)[] := '{}'; v_durs int[] := '{}';
  v_total_price numeric(10,2) := 0; v_total_dur int := 0; v_total_comm numeric(10,2) := 0;
  v_blended numeric(5,2);
  v_end timestamptz;
  v_client_id uuid := p_client_id;
  v_client_name text := p_client_name;
  v_status text;
  v_appt_id uuid;
begin
  if v_studio is null then raise exception 'Não autenticado'; end if;
  v_ids := array_remove(v_ids, null);
  if array_length(v_ids, 1) is null then raise exception 'Escolha ao menos um serviço'; end if;

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

  if p_client_record_id is not null then
    select full_name into v_client_name from clients
    where id = p_client_record_id and studio_id = v_studio;
  elsif v_client_name is null and v_client_id is not null then
    select full_name into v_client_name from profiles where id = v_client_id;
  end if;

  foreach v_sid in array v_ids loop
    select * into v_service from services where id = v_sid and studio_id = v_studio and active;
    if not found then raise exception 'Serviço inválido'; end if;
    select price, duration_minutes into v_ps_price, v_ps_dur
    from professional_services where professional_id = p_professional_id and service_id = v_sid;
    v_price := coalesce(v_ps_price, v_service.price);
    v_duration := coalesce(v_ps_dur, v_service.duration_minutes);
    v_pct := coalesce(v_service.commission_pct_override, v_prof.commission_pct);
    v_names := array_append(v_names, v_service.name);
    v_prices := array_append(v_prices, v_price);
    v_durs := array_append(v_durs, v_duration);
    v_total_price := v_total_price + v_price;
    v_total_dur := v_total_dur + v_duration;
    v_total_comm := v_total_comm + round(v_price * v_pct / 100, 2);
  end loop;

  v_blended := case when v_total_price > 0 then round(v_total_comm / v_total_price * 100, 2)
                    else v_prof.commission_pct end;
  v_end := p_scheduled_start + make_interval(mins => v_total_dur);

  -- Agenda livre: sem checagem de conflito de horário.

  insert into appointments (
    studio_id, professional_id, client_id, client_record_id, client_name_snapshot,
    service_id, price_snapshot, commission_pct_snapshot,
    scheduled_start, scheduled_end, status, notes, created_by
  ) values (
    v_studio, p_professional_id, v_client_id, p_client_record_id, v_client_name,
    v_ids[1], v_total_price, v_blended,
    p_scheduled_start, v_end, v_status, p_notes, auth.uid()
  ) returning id into v_appt_id;

  insert into appointment_items (appointment_id, service_id, name_snapshot, price, duration_minutes)
  select v_appt_id, unnest(v_ids), unnest(v_names), unnest(v_prices), unnest(v_durs);

  return v_appt_id;
end $$;
revoke execute on function book_appointment(uuid, uuid, timestamptz, uuid, text, text, uuid, uuid[]) from public, anon;
grant execute on function book_appointment(uuid, uuid, timestamptz, uuid, text, text, uuid, uuid[]) to authenticated;

-- ---- 3. edit_appointment: array de serviços, sem conflito ----
drop function if exists edit_appointment(uuid, uuid, uuid, timestamptz, uuid, text, text, text);

create or replace function edit_appointment(
  p_id uuid,
  p_professional_id uuid,
  p_service_id uuid,
  p_scheduled_start timestamptz,
  p_client_record_id uuid default null,
  p_client_name text default null,
  p_notes text default null,
  p_payment_method text default null,
  p_service_ids uuid[] default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_studio uuid := auth_studio_id();
  v_role text := auth_role();
  v_appt appointments%rowtype;
  v_prof professionals%rowtype;
  v_service services%rowtype;
  v_ids uuid[] := coalesce(p_service_ids, array[p_service_id]);
  v_sid uuid;
  v_ps_price numeric(10,2); v_ps_dur int;
  v_price numeric(10,2); v_duration int; v_pct numeric(5,2);
  v_names text[] := '{}'; v_prices numeric(10,2)[] := '{}'; v_durs int[] := '{}';
  v_total_price numeric(10,2) := 0; v_total_dur int := 0; v_total_comm numeric(10,2) := 0;
  v_blended numeric(5,2);
  v_end timestamptz; v_client_name text := p_client_name; v_comm numeric(10,2);
begin
  if v_studio is null then raise exception 'Não autenticado'; end if;
  v_ids := array_remove(v_ids, null);
  if array_length(v_ids, 1) is null then raise exception 'Escolha ao menos um serviço'; end if;

  select * into v_appt from appointments where id = p_id and studio_id = v_studio;
  if not found then raise exception 'Atendimento não encontrado'; end if;

  if v_role in ('owner','secretary') then null;
  elsif v_role = 'professional' and v_appt.professional_id = auth_professional_id() then null;
  else raise exception 'Sem permissão para editar'; end if;

  if v_appt.status in ('canceled','no_show') then
    raise exception 'Atendimento cancelado ou com falta não pode ser editado';
  end if;

  select * into v_prof from professionals where id = p_professional_id and studio_id = v_studio and active;
  if not found then raise exception 'Profissional inválida'; end if;

  foreach v_sid in array v_ids loop
    select * into v_service from services where id = v_sid and studio_id = v_studio and active;
    if not found then raise exception 'Serviço inválido'; end if;
    select price, duration_minutes into v_ps_price, v_ps_dur
    from professional_services where professional_id = p_professional_id and service_id = v_sid;
    v_price := coalesce(v_ps_price, v_service.price);
    v_duration := coalesce(v_ps_dur, v_service.duration_minutes);
    v_pct := coalesce(v_service.commission_pct_override, v_prof.commission_pct);
    v_names := array_append(v_names, v_service.name);
    v_prices := array_append(v_prices, v_price);
    v_durs := array_append(v_durs, v_duration);
    v_total_price := v_total_price + v_price;
    v_total_dur := v_total_dur + v_duration;
    v_total_comm := v_total_comm + round(v_price * v_pct / 100, 2);
  end loop;

  v_blended := case when v_total_price > 0 then round(v_total_comm / v_total_price * 100, 2)
                    else v_prof.commission_pct end;
  v_end := p_scheduled_start + make_interval(mins => v_total_dur);

  if p_client_record_id is not null then
    select full_name into v_client_name from clients where id = p_client_record_id and studio_id = v_studio;
  end if;

  -- Agenda livre: sem checagem de conflito de horário.

  update appointments set
    professional_id = p_professional_id,
    service_id = v_ids[1],
    client_record_id = p_client_record_id,
    client_name_snapshot = coalesce(v_client_name, client_name_snapshot),
    price_snapshot = v_total_price,
    commission_pct_snapshot = v_blended,
    scheduled_start = p_scheduled_start,
    scheduled_end = v_end,
    notes = p_notes,
    payment_method = coalesce(p_payment_method, v_appt.payment_method)
  where id = p_id;

  delete from appointment_items where appointment_id = p_id;
  insert into appointment_items (appointment_id, service_id, name_snapshot, price, duration_minutes)
  select p_id, unnest(v_ids), unnest(v_names), unnest(v_prices), unnest(v_durs);

  if v_appt.status = 'done' then
    v_comm := round(v_total_price * v_blended / 100, 2);
    update earnings set
      gross_value = v_total_price, commission_value = v_comm, studio_value = v_total_price - v_comm
    where appointment_id = p_id;
  end if;
end $$;
revoke execute on function edit_appointment(uuid, uuid, uuid, timestamptz, uuid, text, text, text, uuid[]) from public, anon;
grant execute on function edit_appointment(uuid, uuid, uuid, timestamptz, uuid, text, text, text, uuid[]) to authenticated;
