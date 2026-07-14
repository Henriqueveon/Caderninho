-- =========================
-- CADERNINHO — Pagamentos e vales (contas a pagar da equipe)
-- A gestora paga as profissionais (normalmente semanal) e concede vales
-- esporádicos. Aqui ficam os lançamentos, com data, valor e forma.
-- Acesso: a gestora vê tudo o que pagou; cada profissional vê só o que
-- recebeu; a secretária não acessa (financeiro).
-- =========================

create table payments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id),
  professional_id uuid not null references professionals(id) on delete cascade,
  kind text not null default 'payment' check (kind in ('payment','advance')), -- pagamento | vale
  method text check (method in ('pix','cash','debit','credit','other')),      -- forma de pagamento
  amount numeric(10,2) not null check (amount > 0),
  paid_at date not null,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index idx_payments_studio_date on payments (studio_id, paid_at);
create index idx_payments_prof_date on payments (professional_id, paid_at);

alter table payments enable row level security;

-- gestora: CRUD total no estúdio
create policy payments_owner_all on payments for all
  using (studio_id = auth_studio_id() and auth_role() = 'owner')
  with check (studio_id = auth_studio_id() and auth_role() = 'owner');

-- profissional: leitura só dos próprios recebimentos
create policy payments_prof_select on payments for select
  using (
    studio_id = auth_studio_id()
    and professional_id = auth_professional_id()
  );

-- registra no histórico (activity_log)
create trigger log_payments after insert or update or delete on payments
  for each row execute function log_activity();
