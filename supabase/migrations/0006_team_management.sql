-- =========================
-- CADERNINHO — Gestão de equipe (aba Equipe da gestora)
-- =========================

-- Leitura completa da equipe para a gestora (inclui e-mail do auth.users e a
-- lista de serviços de cada profissional). Owner-only — evita expor e-mail da
-- equipe a outros roles via coluna amplamente legível.
create or replace function get_team()
returns table (
  professional_id uuid,
  profile_id uuid,
  full_name text,
  phone text,
  email text,
  commission_pct numeric,
  color text,
  bio text,
  active boolean,
  created_at timestamptz,
  service_ids uuid[]
)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth_role() <> 'owner' then
    raise exception 'Apenas a gestora pode ver a equipe';
  end if;
  return query
    select
      p.id, p.profile_id, pf.full_name, pf.phone, u.email::text,
      p.commission_pct, p.color, p.bio, p.active, p.created_at,
      coalesce(
        (select array_agg(ps.service_id) from professional_services ps
         where ps.professional_id = p.id),
        '{}'::uuid[]
      )
    from professionals p
    join profiles pf on pf.id = p.profile_id
    join auth.users u on u.id = p.profile_id
    where p.studio_id = auth_studio_id()
    order by p.active desc, pf.full_name;
end $$;
revoke execute on function get_team() from public, anon;
grant execute on function get_team() to authenticated;
