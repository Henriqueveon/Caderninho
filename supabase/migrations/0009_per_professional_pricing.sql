-- =========================
-- CADERNINHO — Preço e duração por profissional
-- O mesmo serviço custa/dura diferente conforme a profissional
-- (ex.: Esmaltação em gel — Vic R$90/60min, Pati/Kim R$80/90min).
-- services.price/duration viram DEFAULT; o valor real vem de
-- professional_services quando preenchido.
-- =========================

alter table professional_services
  add column price numeric(10,2),
  add column duration_minutes int;

-- book_appointment passa a usar o override da profissional (fallback no serviço)
create or replace function book_appointment(
  p_professional_id uuid,
  p_service_id uuid,
  p_scheduled_start timestamptz,
  p_client_id uuid default null,
  p_client_name text default null,
  p_notes text default null
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

  if v_client_name is null and v_client_id is not null then
    select full_name into v_client_name from profiles where id = v_client_id;
  end if;

  -- override da profissional para este serviço (se houver)
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
    studio_id, professional_id, client_id, client_name_snapshot,
    service_id, price_snapshot, commission_pct_snapshot,
    scheduled_start, scheduled_end, status, notes, created_by
  ) values (
    v_studio, p_professional_id, v_client_id, v_client_name,
    p_service_id, v_price, v_pct,
    p_scheduled_start, v_end, v_status, p_notes, auth.uid()
  ) returning id into v_appt_id;

  return v_appt_id;
end $$;
