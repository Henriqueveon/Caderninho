-- =========================
-- CADERNINHO — Editar atendimento concluído + excluir qualquer status
-- edit_appointment passa a aceitar CONCLUÍDO (recalcula a comissão e permite
-- corrigir a forma de pagamento). Bloqueado só para cancelado/faltou.
-- delete_appointment remove a comissão junto (gestão apenas).
-- =========================

drop function if exists edit_appointment(uuid, uuid, uuid, timestamptz, uuid, text, text);

create or replace function edit_appointment(
  p_id uuid,
  p_professional_id uuid,
  p_service_id uuid,
  p_scheduled_start timestamptz,
  p_client_record_id uuid default null,
  p_client_name text default null,
  p_notes text default null,
  p_payment_method text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_studio uuid := auth_studio_id();
  v_role text := auth_role();
  v_appt appointments%rowtype;
  v_service services%rowtype;
  v_prof professionals%rowtype;
  v_ps_price numeric(10,2); v_ps_dur int;
  v_price numeric(10,2); v_duration int; v_pct numeric(5,2);
  v_end timestamptz; v_client_name text := p_client_name; v_comm numeric(10,2);
begin
  if v_studio is null then raise exception 'Não autenticado'; end if;

  select * into v_appt from appointments where id = p_id and studio_id = v_studio;
  if not found then raise exception 'Atendimento não encontrado'; end if;

  if v_role in ('owner','secretary') then null;
  elsif v_role = 'professional' and v_appt.professional_id = auth_professional_id() then null;
  else raise exception 'Sem permissão para editar'; end if;

  if v_appt.status in ('canceled','no_show') then
    raise exception 'Atendimento cancelado ou com falta não pode ser editado';
  end if;

  select * into v_service from services where id = p_service_id and studio_id = v_studio and active;
  if not found then raise exception 'Serviço inválido'; end if;
  select * into v_prof from professionals where id = p_professional_id and studio_id = v_studio and active;
  if not found then raise exception 'Profissional inválida'; end if;

  select price, duration_minutes into v_ps_price, v_ps_dur
  from professional_services where professional_id = p_professional_id and service_id = p_service_id;
  v_price := coalesce(v_ps_price, v_service.price);
  v_duration := coalesce(v_ps_dur, v_service.duration_minutes);
  v_pct := coalesce(v_service.commission_pct_override, v_prof.commission_pct);
  v_end := p_scheduled_start + make_interval(mins => v_duration);

  if p_client_record_id is not null then
    select full_name into v_client_name from clients where id = p_client_record_id and studio_id = v_studio;
  end if;

  if v_appt.status <> 'done' and exists (
    select 1 from appointments
    where professional_id = p_professional_id and id <> p_id
      and status in ('scheduled','confirmed','in_progress')
      and scheduled_start < v_end and scheduled_end > p_scheduled_start
  ) then
    raise exception 'Horário indisponível para esta profissional';
  end if;

  update appointments set
    professional_id = p_professional_id,
    service_id = p_service_id,
    client_record_id = p_client_record_id,
    client_name_snapshot = coalesce(v_client_name, client_name_snapshot),
    price_snapshot = v_price,
    commission_pct_snapshot = v_pct,
    scheduled_start = p_scheduled_start,
    scheduled_end = v_end,
    notes = p_notes,
    payment_method = coalesce(p_payment_method, v_appt.payment_method)
  where id = p_id;

  if v_appt.status = 'done' then
    v_comm := round(v_price * v_pct / 100, 2);
    update earnings set
      gross_value = v_price, commission_value = v_comm, studio_value = v_price - v_comm
    where appointment_id = p_id;
  end if;
end $$;
revoke execute on function edit_appointment(uuid, uuid, uuid, timestamptz, uuid, text, text, text) from public, anon;
grant execute on function edit_appointment(uuid, uuid, uuid, timestamptz, uuid, text, text, text) to authenticated;

create or replace function delete_appointment(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_studio uuid := auth_studio_id();
begin
  if auth_role() not in ('owner','secretary') then
    raise exception 'Apenas a gestão pode excluir atendimentos';
  end if;
  if not exists (select 1 from appointments where id = p_id and studio_id = v_studio) then
    raise exception 'Atendimento não encontrado';
  end if;
  delete from earnings where appointment_id = p_id;
  delete from appointments where id = p_id;
end $$;
revoke execute on function delete_appointment(uuid) from public, anon;
grant execute on function delete_appointment(uuid) to authenticated;
