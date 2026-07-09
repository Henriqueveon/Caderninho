-- =========================
-- CADERNINHO — RLS e funções auxiliares
-- =========================

-- Helpers security definer: bypassa RLS de profiles/professionals para
-- evitar recursão nas políticas e permitir checagens de tenant.
create or replace function auth_studio_id()
returns uuid language sql stable security definer set search_path = public as $$
  select studio_id from profiles where id = auth.uid()
$$;

create or replace function auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_professional_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from professionals where profile_id = auth.uid()
$$;

create or replace function professional_studio(pid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select studio_id from professionals where id = pid
$$;

-- Ativar RLS em todas as tabelas
alter table studios enable row level security;
alter table profiles enable row level security;
alter table professionals enable row level security;
alter table services enable row level security;
alter table professional_services enable row level security;
alter table availability_rules enable row level security;
alter table availability_exceptions enable row level security;
alter table appointments enable row level security;
alter table earnings enable row level security;
alter table goals enable row level security;
alter table bonuses enable row level security;
alter table invites enable row level security;
alter table activity_log enable row level security;

-- STUDIOS
create policy studios_select on studios for select
  using (id = auth_studio_id());
create policy studios_update on studios for update
  using (id = auth_studio_id() and auth_role() = 'owner');

-- PROFILES
-- própria linha; owner/professional leem perfis do estúdio (nomes de clientes
-- na agenda); cliente lê apenas perfis de owner/professional (para agendar).
create policy profiles_select on profiles for select
  using (
    id = auth.uid()
    or (studio_id = auth_studio_id() and auth_role() in ('owner','professional'))
    or (studio_id = auth_studio_id() and role in ('owner','professional'))
  );
create policy profiles_update on profiles for update
  using (id = auth.uid() or (studio_id = auth_studio_id() and auth_role() = 'owner'));

-- PROFESSIONALS (commission_pct é sensível: só owner e a própria profissional)
create policy professionals_select on professionals for select
  using (studio_id = auth_studio_id() and (auth_role() = 'owner' or profile_id = auth.uid()));
create policy professionals_owner_all on professionals for all
  using (studio_id = auth_studio_id() and auth_role() = 'owner')
  with check (studio_id = auth_studio_id() and auth_role() = 'owner');

-- View pública (sem comissão) para clientes escolherem profissional
create view professionals_public as
  select p.id, p.studio_id, p.profile_id, pr.full_name, p.color, p.bio, p.active
  from professionals p
  join profiles pr on pr.id = p.profile_id
  where p.studio_id = auth_studio_id() and p.active;
grant select on professionals_public to authenticated;

-- SERVICES
create policy services_select on services for select
  using (studio_id = auth_studio_id() and (active or auth_role() = 'owner'));
create policy services_owner_all on services for all
  using (studio_id = auth_studio_id() and auth_role() = 'owner')
  with check (studio_id = auth_studio_id() and auth_role() = 'owner');

-- PROFESSIONAL_SERVICES
create policy prof_services_select on professional_services for select
  using (professional_studio(professional_id) = auth_studio_id());
create policy prof_services_owner_all on professional_services for all
  using (professional_studio(professional_id) = auth_studio_id() and auth_role() = 'owner')
  with check (professional_studio(professional_id) = auth_studio_id() and auth_role() = 'owner');

-- AVAILABILITY (clientes leem para calcular slots livres)
create policy avail_rules_select on availability_rules for select
  using (studio_id = auth_studio_id());
create policy avail_rules_write on availability_rules for all
  using (studio_id = auth_studio_id()
    and (auth_role() = 'owner' or professional_id = auth_professional_id()))
  with check (studio_id = auth_studio_id()
    and (auth_role() = 'owner' or professional_id = auth_professional_id()));

create policy avail_exc_select on availability_exceptions for select
  using (studio_id = auth_studio_id());
create policy avail_exc_write on availability_exceptions for all
  using (studio_id = auth_studio_id()
    and (auth_role() = 'owner' or professional_id = auth_professional_id()))
  with check (studio_id = auth_studio_id()
    and (auth_role() = 'owner' or professional_id = auth_professional_id()));

-- APPOINTMENTS
create policy appt_select on appointments for select
  using (studio_id = auth_studio_id() and (
    auth_role() = 'owner'
    or professional_id = auth_professional_id()
    or client_id = auth.uid()
  ));
create policy appt_insert on appointments for insert
  with check (studio_id = auth_studio_id() and (
    auth_role() = 'owner'
    or professional_id = auth_professional_id()
    or (auth_role() = 'client' and client_id = auth.uid() and status = 'scheduled')
  ));
create policy appt_update on appointments for update
  using (studio_id = auth_studio_id() and (
    auth_role() = 'owner'
    or professional_id = auth_professional_id()
    or client_id = auth.uid()
  ));
create policy appt_delete on appointments for delete
  using (studio_id = auth_studio_id() and auth_role() = 'owner');

-- EARNINGS (insert só via trigger security definer)
create policy earnings_select on earnings for select
  using (studio_id = auth_studio_id() and (
    auth_role() = 'owner' or professional_id = auth_professional_id()
  ));

-- GOALS
create policy goals_select on goals for select
  using (studio_id = auth_studio_id() and (
    auth_role() = 'owner' or professional_id = auth_professional_id()
  ));
create policy goals_owner_all on goals for all
  using (studio_id = auth_studio_id() and auth_role() = 'owner')
  with check (studio_id = auth_studio_id() and auth_role() = 'owner');

-- BONUSES
create policy bonuses_select on bonuses for select
  using (studio_id = auth_studio_id() and (
    auth_role() = 'owner' or professional_id = auth_professional_id()
  ));
create policy bonuses_owner_all on bonuses for all
  using (studio_id = auth_studio_id() and auth_role() = 'owner')
  with check (studio_id = auth_studio_id() and auth_role() = 'owner');

-- INVITES (só a gestora)
create policy invites_owner_all on invites for all
  using (studio_id = auth_studio_id() and auth_role() = 'owner')
  with check (studio_id = auth_studio_id() and auth_role() = 'owner');

-- ACTIVITY LOG (insert só via trigger security definer)
create policy log_select on activity_log for select
  using (studio_id = auth_studio_id() and (
    auth_role() = 'owner' or actor_id = auth.uid()
  ));

-- =========================
-- RPCs
-- =========================

-- Horários ocupados sem expor dados de terceiros (cliente vê só "indisponível")
create or replace function get_busy_times(
  p_professional_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (busy_start timestamptz, busy_end timestamptz)
language sql stable security definer set search_path = public as $$
  select scheduled_start, scheduled_end
  from appointments
  where professional_id = p_professional_id
    and status in ('scheduled','confirmed','in_progress')
    and scheduled_start < p_to
    and scheduled_end > p_from
$$;
grant execute on function get_busy_times to authenticated;

-- Dados do convite para a tela /invite/:token (antes do login)
create or replace function get_invite(invite_token uuid)
returns table (full_name text, email text, studio_name text, accepted boolean)
language sql stable security definer set search_path = public as $$
  select i.full_name, i.email, s.name, i.accepted_at is not null
  from invites i
  join studios s on s.id = i.studio_id
  where i.token = invite_token
$$;
grant execute on function get_invite to anon, authenticated;

-- Usuária recém-cadastrada aceita o convite e vira profissional
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
  set role = 'professional',
      studio_id = v_invite.studio_id,
      full_name = coalesce(v_invite.full_name, full_name)
  where id = auth.uid();

  insert into professionals (studio_id, profile_id, commission_pct)
  values (v_invite.studio_id, auth.uid(), v_invite.commission_pct)
  on conflict (profile_id) do nothing;

  update invites set accepted_at = now() where id = v_invite.id;
end
$$;
grant execute on function accept_invite to authenticated;
