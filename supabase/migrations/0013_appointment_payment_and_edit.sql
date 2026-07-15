-- =========================
-- CADERNINHO — Forma de pagamento da cliente + editar atendimento
--             + todos os acessos cadastram cliente
-- =========================

-- forma de pagamento da CLIENTE ao estúdio (registrada ao finalizar)
alter table appointments add column payment_method text
  check (payment_method in ('pix','cash','debit','credit','other'));

-- todos os acessos da equipe podem CADASTRAR clientes
-- (update/delete continua restrito a owner/secretary via clients_write)
create policy clients_insert_staff on clients for insert
  with check (
    studio_id = auth_studio_id()
    and auth_role() in ('owner','secretary','professional')
  );

-- editar um atendimento agendado errado: recalcula os snapshots de preço,
-- comissão e término, mantendo id/status/histórico. Bloqueado após finalizado.
create or replace function edit_appointment(
  p_id uuid,
  p_professional_id uuid,
  p_service_id uuid,
  p_scheduled_start timestamptz,
  p_client_record_id uuid default null,
  p_client_name text default null,
  p_notes text default null
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
  v_end timestamptz; v_client_name text := p_client_name;
begin
  if v_studio is null then raise exception 'Não autenticado'; end if;

  select * into v_appt from appointments where id = p_id and studio_id = v_studio;
  if not found then raise exception 'Atendimento não encontrado'; end if;

  if v_role in ('owner','secretary') then
    null;
  elsif v_role = 'professional' and v_appt.professional_id = auth_professional_id() then
    null;
  else
    raise exception 'Sem permissão para editar';
  end if;

  if v_appt.status in ('done','canceled','no_show') then
    raise exception 'Atendimento já finalizado não pode ser editado';
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

  if exists (
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
    notes = p_notes
  where id = p_id;
end $$;
revoke execute on function edit_appointment(uuid, uuid, uuid, timestamptz, uuid, text, text) from public, anon;
grant execute on function edit_appointment(uuid, uuid, uuid, timestamptz, uuid, text, text) to authenticated;
