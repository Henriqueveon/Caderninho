-- =========================
-- CADERNINHO — Excluir serviço com segurança
-- Serviço já usado em atendimentos não pode ser apagado (quebraria o
-- histórico via price_snapshot dos atendimentos) — nesse caso, desative.
-- =========================

create or replace function remove_service(p_service_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_svc services%rowtype;
begin
  if auth_role() <> 'owner' then
    raise exception 'Apenas a gestora pode excluir serviços';
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
