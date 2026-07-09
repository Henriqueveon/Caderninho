-- =========================
-- CADERNINHO — Role secretária + RPC de agendamento
-- Hierarquia: owner (tudo) · secretary (todas as agendas, SEM faturamento)
--             professional (só a sua agenda + seu faturamento) · client (agenda a si)
-- =========================

-- 1. Nova role no check de profiles
alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('owner','professional','secretary','client'));

-- 2. Convites passam a carregar a role (owner convida professional OU secretary)
alter table invites add column role text not null default 'professional'
  check (role in ('professional','secretary'));

create or replace function accept_invite(invite_token uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_invite invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_invite from invites
  where token = invite_token and accepted_at is null;

  if not found then
    raise exception 'Convite inválido ou já utilizado';
  end if;

  update profiles
  set role = v_invite.role,
      studio_id = v_invite.studio_id,
      full_name = coalesce(v_invite.full_name, full_name)
  where id = auth.uid();

  if v_invite.role = 'professional' then
    insert into professionals (studio_id, profile_id, commission_pct)
    values (v_invite.studio_id, auth.uid(), v_invite.commission_pct)
    on conflict (profile_id) do nothing;
  end if;

  update invites set accepted_at = now() where id = v_invite.id;
end $$;

-- 3. RLS: secretária enxerga/gerencia todas as agendas do estúdio
--    (mas NÃO earnings/goals/bonuses — essas tabelas não a incluem)

-- profiles: secretária lê todos os perfis do estúdio (nomes de clientes na agenda)
drop policy profiles_select on profiles;
create policy profiles_select on profiles for select
  using (
    id = auth.uid()
    or (studio_id = auth_studio_id() and auth_role() in ('owner','professional','secretary'))
    or (studio_id = auth_studio_id() and role in ('owner','professional'))
  );

-- appointments: secretária tem CRUD como a gestora
create policy appt_select_secretary on appointments for select
  using (studio_id = auth_studio_id() and auth_role() = 'secretary');
create policy appt_insert_secretary on appointments for insert
  with check (studio_id = auth_studio_id() and auth_role() = 'secretary');
create policy appt_update_secretary on appointments for update
  using (studio_id = auth_studio_id() and auth_role() = 'secretary');
create policy appt_delete_secretary on appointments for delete
  using (studio_id = auth_studio_id() and auth_role() = 'secretary');

-- disponibilidade: secretária pode ajustar a agenda de qualquer profissional
create policy avail_rules_secretary on availability_rules for all
  using (studio_id = auth_studio_id() and auth_role() = 'secretary')
  with check (studio_id = auth_studio_id() and auth_role() = 'secretary');
create policy avail_exc_secretary on availability_exceptions for all
  using (studio_id = auth_studio_id() and auth_role() = 'secretary')
  with check (studio_id = auth_studio_id() and auth_role() = 'secretary');

-- 4. RPC de agendamento: snapshots calculados no servidor (regra de ouro),
--    autorização por role, checagem de conflito de horário.
--    Secretária/cliente nunca leem commission_pct — o cálculo é server-side.
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

  -- autorização por role
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

  -- nome congelado: avulsa usa o texto; cliente com login usa o nome do perfil
  if v_client_name is null and v_client_id is not null then
    select full_name into v_client_name from profiles where id = v_client_id;
  end if;

  v_pct := coalesce(v_service.commission_pct_override, v_prof.commission_pct);
  v_end := p_scheduled_start + make_interval(mins => v_service.duration_minutes);

  -- conflito com atendimentos ativos da mesma profissional
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
    p_service_id, v_service.price, v_pct,
    p_scheduled_start, v_end, v_status, p_notes, auth.uid()
  ) returning id into v_appt_id;

  return v_appt_id;
end $$;
revoke execute on function book_appointment(uuid, uuid, timestamptz, uuid, text, text) from public, anon;
grant execute on function book_appointment(uuid, uuid, timestamptz, uuid, text, text) to authenticated;
