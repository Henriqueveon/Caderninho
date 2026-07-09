-- =========================
-- CADERNINHO — Remover integrante da equipe
-- Regras:
--  · Quem tem histórico (atendimentos/comissões) NÃO é apagado — desative.
--  · Profissional/secretária pura: remove tudo (professional, profile, login).
--  · Gestora (owner) que também é profissional: remove só o papel de
--    profissional, preservando a conta de gestora.
-- =========================

create or replace function remove_team_member(p_professional_id uuid)
returns text
language plpgsql security definer set search_path = public, auth as $$
declare
  v_prof professionals%rowtype;
  v_role text;
begin
  if auth_role() <> 'owner' then
    raise exception 'Apenas a gestora pode remover a equipe';
  end if;

  select * into v_prof from professionals
  where id = p_professional_id and studio_id = auth_studio_id();
  if not found then
    raise exception 'Profissional não encontrada';
  end if;

  -- Preserva histórico financeiro: com movimento, só desativação é permitida.
  if exists (select 1 from appointments where professional_id = p_professional_id)
     or exists (select 1 from earnings where professional_id = p_professional_id) then
    raise exception 'Esta profissional tem histórico de atendimentos e não pode ser removida. Desative-a para preservar o histórico financeiro.';
  end if;

  select role into v_role from profiles where id = v_prof.profile_id;

  -- remove o vínculo de profissional (agenda/serviços)
  delete from professional_services where professional_id = p_professional_id;
  delete from availability_rules where professional_id = p_professional_id;
  delete from availability_exceptions where professional_id = p_professional_id;
  delete from professionals where id = p_professional_id;

  if v_role = 'owner' then
    -- a gestora deixa de ser profissional mas mantém a conta
    return 'role_removed';
  end if;

  -- profissional/secretária pura: remove o login por completo.
  -- Solta referências que não têm cascade antes de apagar o perfil.
  update appointments set created_by = null where created_by = v_prof.profile_id;
  update activity_log set actor_id = null where actor_id = v_prof.profile_id;
  update invites set created_by = null where created_by = v_prof.profile_id;

  delete from auth.users where id = v_prof.profile_id; -- cascata apaga o profile

  return 'deleted';
end $$;
revoke execute on function remove_team_member(uuid) from public, anon;
grant execute on function remove_team_member(uuid) to authenticated;
