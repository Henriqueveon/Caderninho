-- =========================
-- CADERNINHO — Correções sobre a 0016 (revisão antes do deploy)
--
-- A 0016 abriu serviços e clientes para a equipe com um `for all`, o que
-- liberou junto duas coisas que ninguém pediu e que destroem histórico:
--
--   1) DELETE direto em services. O RPC remove_service protege o histórico,
--      mas a política deixava passar por fora dele. Pior: o guarda do RPC só
--      olhava appointments.service_id e ignorava appointment_items — e
--      appointment_items.service_id é ON DELETE SET NULL, então apagar um
--      serviço usado só como item extra apagava a referência em silêncio.
--      (Hoje já existem 19 itens nessa situação.)
--
--   2) DELETE direto em clients por qualquer profissional. O pedido era
--      CADASTRAR cliente; excluir cadastro segue com a gestora.
--
-- Também troca a soma do saldo por um agregado no banco: o PostgREST corta a
-- resposta em 1000 linhas, então somar linha a linha no navegador passaria a
-- ERRAR dinheiro em silêncio assim que as comissões passassem desse número.
-- =========================

-- -------------------------------------------------------- SERVIÇOS: sem DELETE direto
-- Sem política de DELETE, a única porta é o RPC (security definer), que checa
-- o histórico antes de deixar apagar.
drop policy if exists services_staff_all on services;

create policy services_staff_insert on services for insert
  with check (
    studio_id = auth_studio_id()
    and auth_role() in ('owner', 'professional', 'secretary')
  );

create policy services_staff_update on services for update
  using (
    studio_id = auth_studio_id()
    and auth_role() in ('owner', 'professional', 'secretary')
  )
  with check (
    studio_id = auth_studio_id()
    and auth_role() in ('owner', 'professional', 'secretary')
  );

-- Guarda completo: atendimento principal OU item extra bloqueiam a exclusão.
create or replace function remove_service(p_service_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth_role() not in ('owner', 'professional', 'secretary') then
    raise exception 'Apenas a equipe do estúdio pode excluir serviços';
  end if;

  if not exists (
    select 1 from services
    where id = p_service_id and studio_id = auth_studio_id()
  ) then
    raise exception 'Serviço não encontrado';
  end if;

  if exists (select 1 from appointments where service_id = p_service_id)
     or exists (select 1 from appointment_items where service_id = p_service_id)
  then
    raise exception 'Este serviço já foi usado em atendimentos e não pode ser excluído. Desative-o para tirá-lo da lista.';
  end if;

  delete from services where id = p_service_id; -- cascata em professional_services
  return 'deleted';
end $$;
revoke execute on function remove_service(uuid) from public, anon;
grant execute on function remove_service(uuid) to authenticated;

-- -------------------------------------------------------- CLIENTES: excluir só a gestora
drop policy if exists clients_write on clients;

create policy clients_update_staff on clients for update
  using (
    studio_id = auth_studio_id()
    and auth_role() in ('owner', 'secretary', 'professional')
  )
  with check (
    studio_id = auth_studio_id()
    and auth_role() in ('owner', 'secretary', 'professional')
  );

create policy clients_delete_owner on clients for delete
  using (studio_id = auth_studio_id() and auth_role() = 'owner');

-- (o INSERT continua na clients_insert_staff, criada na 0010)

-- -------------------------------------------------------- SALDO: agregado no banco
-- Uma linha por profissional, somada no Postgres — sem depender de trazer
-- todas as comissões para o navegador.
create or replace function get_balances()
returns table (
  professional_id uuid,
  commission numeric,
  bonus numeric,
  paid numeric,
  saldo numeric
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_role text := auth_role();
  v_studio uuid := auth_studio_id();
  v_me uuid := auth_professional_id();
begin
  -- Secretária e cliente não recebem nada: valores não passam por elas.
  if v_role not in ('owner', 'professional') then
    return;
  end if;

  return query
  select
    p.id,
    coalesce(e.total, 0)::numeric,
    coalesce(b.total, 0)::numeric,
    coalesce(pg.total, 0)::numeric,
    (coalesce(e.total, 0) + coalesce(b.total, 0) - coalesce(pg.total, 0))::numeric
  from professionals p
  left join (
    select earnings.professional_id as pid, sum(earnings.commission_value) as total
    from earnings group by 1
  ) e on e.pid = p.id
  left join (
    select bonuses.professional_id as pid, sum(bonuses.value) as total
    from bonuses group by 1
  ) b on b.pid = p.id
  left join (
    select payments.professional_id as pid, sum(payments.amount) as total
    from payments group by 1
  ) pg on pg.pid = p.id
  where p.studio_id = v_studio
    and (v_role = 'owner' or p.id = v_me);
end $$;
revoke execute on function get_balances() from public, anon;
grant execute on function get_balances() to authenticated;
