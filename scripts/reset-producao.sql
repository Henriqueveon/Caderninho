-- =========================================================
-- CADERNINHO — Reset para produção
-- Zera TODOS os dados operacionais/demo.
-- MANTÉM: logins (auth/profiles), equipe (professionals),
--         serviços ativos, disponibilidade e configurações do estúdio.
-- =========================================================
begin;

delete from payments;
delete from bonuses;
delete from goals;
delete from earnings;
delete from appointments;
delete from clients;
delete from activity_log;

-- remove os serviços de teste que estavam inativos (lixo do seed);
-- os serviços reais (ativos) permanecem
delete from services where active = false;

commit;

-- Conferência (deve dar tudo 0, exceto services/professionals/rules):
select
  (select count(*) from appointments) as agendamentos,
  (select count(*) from clients)      as clientes,
  (select count(*) from earnings)     as comissoes,
  (select count(*) from payments)     as pagamentos,
  (select count(*) from goals)        as metas,
  (select count(*) from services)     as servicos_ativos,
  (select count(*) from professionals where active) as profissionais;
