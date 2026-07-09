# Caderninho

Sistema de gestão para estúdio de unhas: agenda inteligente, motor de comissões, previsibilidade de ganhos e portal da cliente. Especificação completa em [CLAUDE.md](./CLAUDE.md).

## Rodando localmente

```bash
npm install
npm run dev
```

Requer `.env.local` na raiz (veja `.env.example`):

```
VITE_SUPABASE_URL=https://bsbdzemsbaonaopzqldy.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key do projeto>
```

## Backend (Supabase)

- Projeto dedicado: `caderninho` (ref `bsbdzemsbaonaopzqldy`, região `sa-east-1`).
- Migrations versionadas em `supabase/migrations/` (já aplicadas no projeto remoto).
- Seed em `supabase/seed.sql` (estúdio demo + 6 serviços — já aplicado).
- RLS ativa em todas as tabelas; multi-tenant por `studio_id` desde o dia 1.

### Criando a gestora (primeiro acesso)

Todo signup nasce como `client` (evita escalação de privilégio). Para promover a gestora:

1. Crie a conta em `/signup` no app.
2. No SQL Editor do Supabase, rode:

```sql
update profiles set role = 'owner'
where id = (select id from auth.users where email = 'email@dagestora.com');
```

Profissionais entram pelo fluxo de convite (`/invite/:token`), gerado pela gestora.

## Testes

```bash
npm test
```

Cobrem o algoritmo de slots (`src/lib/slots.ts`) e o motor de comissões (`src/lib/earnings.ts`) — mesmas fórmulas do trigger `create_earning_on_done` no banco.

## Status do MVP

- [x] Fase 1 — Fundação: scaffold, migrations + RLS + seed, auth com roteamento por role, convite de profissional
- [ ] Fase 2 — Agenda interna (disponibilidade, slots na UI, fluxo de atendimento)
- [ ] Fase 3 — Financeiro (dashboards, metas, fechamento de mês)
- [ ] Fase 4 — Portal da cliente
- [ ] Fase 5 — Performance e histórico
- [ ] Fase 6 — Polimento (animações, realtime)

## Deploy

Vercel (importar o repo, configurar as duas variáveis `VITE_*`). Build: `npm run build`.
