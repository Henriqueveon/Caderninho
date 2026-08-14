-- =========================
-- CADERNINHO — Equipe cadastra serviços e clientes
--
-- Decisão da gestora: as parceiras passam a poder criar, editar e desativar
-- serviços do catálogo, e a cadastrar/editar clientes — sem pedir para a
-- gestora. A contrapartida é RASTREABILIDADE: toda ação sobre serviços,
-- clientes e pagamentos vira linha no activity_log com o autor, e a gestora
-- lê o log inteiro (cada parceira lê o que ela mesma fez).
--
-- A SECRETÁRIA entra em serviços e clientes, mas continua sem acesso a
-- nenhum valor: earnings, goals, bonuses e payments seguem bloqueados para
-- ela — é a regra do estúdio de que salário/comissão não passa pela recepção.
-- =========================

-- ---------------------------------------------------------------- SERVIÇOS
-- Antes: só a gestora escrevia. Agora: toda a equipe.
drop policy if exists services_owner_all on services;
create policy services_staff_all on services for all
  using (
    studio_id = auth_studio_id()
    and auth_role() in ('owner', 'professional', 'secretary')
  )
  with check (
    studio_id = auth_studio_id()
    and auth_role() in ('owner', 'professional', 'secretary')
  );

-- Vínculo profissional↔serviço (é onde mora o preço/duração de cada uma).
drop policy if exists prof_services_owner_all on professional_services;
create policy prof_services_staff_all on professional_services for all
  using (
    professional_studio(professional_id) = auth_studio_id()
    and auth_role() in ('owner', 'professional', 'secretary')
  )
  with check (
    professional_studio(professional_id) = auth_studio_id()
    and auth_role() in ('owner', 'professional', 'secretary')
  );

-- Excluir serviço deixa de ser exclusivo da gestora. A trava que importa
-- continua de pé: serviço já usado em atendimento não some, só desativa.
create or replace function remove_service(p_service_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_svc services%rowtype;
begin
  if auth_role() not in ('owner', 'professional', 'secretary') then
    raise exception 'Apenas a equipe do estúdio pode excluir serviços';
  end if;

  select * into v_svc from services
  where id = p_service_id and studio_id = auth_studio_id();
  if not found then
    raise exception 'Serviço não encontrado';
  end if;

  if exists (select 1 from appointments where service_id = p_service_id) then
    raise exception 'Este serviço já foi usado em atendimentos e não pode ser excluído. Desative-o para tirá-lo da lista.';
  end if;

  delete from services where id = p_service_id; -- cascata em professional_services
  return 'deleted';
end $$;
revoke execute on function remove_service(uuid) from public, anon;
grant execute on function remove_service(uuid) to authenticated;

-- ---------------------------------------------------------------- CLIENTES
-- A profissional já conseguia cadastrar (clients_insert_staff); faltava
-- editar os dados da cliente que ela mesma atende.
drop policy if exists clients_write on clients;
create policy clients_write on clients for all
  using (
    studio_id = auth_studio_id()
    and auth_role() in ('owner', 'secretary', 'professional')
  )
  with check (
    studio_id = auth_studio_id()
    and auth_role() in ('owner', 'secretary', 'professional')
  );

-- A lista com estatísticas passa a valer para a profissional também.
create or replace function get_clients_with_stats()
returns table (
  id uuid, full_name text, phone text, email text, notes text, created_at timestamptz,
  total int, done int, no_show int, canceled int, upcoming int, last_visit timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth_role() not in ('owner','secretary','professional') then
    raise exception 'Apenas a equipe do estúdio pode ver a lista de clientes';
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

-- ---------------------------------------------------------------- HISTÓRICO
-- Liberdade exige registro: clientes e pagamentos passam a ser auditados
-- como já eram atendimentos, serviços, disponibilidade e metas.
drop trigger if exists log_clients on clients;
create trigger log_clients after insert or update or delete on clients
  for each row execute function log_activity();

drop trigger if exists log_payments on payments;
create trigger log_payments after insert or update or delete on payments
  for each row execute function log_activity();
