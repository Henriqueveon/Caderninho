-- =========================
-- CADERNINHO — Equipe lê serviços inativos
-- Atendimentos antigos podem apontar para serviços já desativados. A equipe
-- (owner/professional/secretary) precisa ler o nome desses serviços para
-- exibir o histórico; o cliente continua vendo só os ativos (para agendar).
-- =========================

drop policy services_select on services;
create policy services_select on services for select
  using (
    studio_id = auth_studio_id()
    and (active or auth_role() in ('owner', 'professional', 'secretary'))
  );
