-- =========================
-- CADERNINHO — Hardening (advisors do Supabase)
-- =========================

-- View security definer é flagged como ERROR pelo linter; RPC equivale
-- e deixa a intenção explícita (clientes veem profissionais sem comissão).
drop view if exists professionals_public;

create or replace function get_bookable_professionals()
returns table (id uuid, profile_id uuid, full_name text, color text, bio text)
language sql stable security definer set search_path = public as $$
  select p.id, p.profile_id, pr.full_name, p.color, p.bio
  from professionals p
  join profiles pr on pr.id = p.profile_id
  where p.studio_id = auth_studio_id() and p.active
$$;
revoke execute on function get_bookable_professionals() from public, anon;
grant execute on function get_bookable_professionals() to authenticated;

-- Funções de trigger nunca devem ser chamáveis via API REST
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function create_earning_on_done() from public, anon, authenticated;
revoke execute on function log_activity() from public, anon, authenticated;

-- Helpers de policy: só usuários logados (policies rodam com o role do caller)
revoke execute on function auth_studio_id() from public, anon;
revoke execute on function auth_role() from public, anon;
revoke execute on function auth_professional_id() from public, anon;
revoke execute on function professional_studio(uuid) from public, anon;

-- RPCs: get_invite mantém anon (tela /invite/:token é pré-login)
revoke execute on function get_busy_times(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function accept_invite(uuid) from public, anon;
revoke execute on function get_invite(uuid) from public;
