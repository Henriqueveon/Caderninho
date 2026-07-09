# CADERNINHO — Sistema de Gestão para Estúdio de Unhas
## Documento de Especificação Completa para Claude Code

> **Nome do projeto:** Caderninho (o caderninho de anotações do estúdio, agora profissional). Slug técnico: `caderninho` — usar em todo o código, no nome da pasta, do repositório GitHub, do projeto Supabase e do projeto Vercel.
> **Uso deste documento:** este arquivo é o contexto-mestre do projeto.

> **Estado atual (2026-07-09):** Fase 1 concluída. Projeto Supabase dedicado criado (ref `bsbdzemsbaonaopzqldy`, sa-east-1), migrations + RLS + triggers + seed aplicados, auth com roteamento por role funcionando, libs core (`slots.ts`, `earnings.ts`) com 20 testes unitários. Próximo passo: Fase 2 (agenda interna).

---

## 1. VISÃO GERAL

### 1.1 O problema
Estúdios de unhas (esmalterias) operam de forma amadora: agenda no papel ou WhatsApp, comissões calculadas na mão no fim do mês, zero previsibilidade de ganhos, nenhum registro de performance. Profissionais não sabem quanto vão ganhar se preencherem a agenda; gestoras não têm visão consolidada da operação.

### 1.2 A solução
Um painel web de gestão que profissionaliza a operação do estúdio:

- **Agenda inteligente** — cada profissional controla seus horários disponíveis; gestora vê todas as agendas.
- **Motor de comissões** — percentual base por profissional + metas e bônus, calculado automaticamente a cada atendimento.
- **Previsibilidade de ganhos** — "se você preencher os próximos X dias, ganha R$ Y".
- **Performance registrada** — tempo real de atendimento vs. tempo previsto, histórico de ações do mês.
- **Portal da cliente** — clientes com login podem ver horários disponíveis e agendar (foco secundário; o coração do sistema é a gestão interna).

### 1.3 Escopo estratégico
- **Hoje:** um único estúdio.
- **Amanhã:** SaaS multi-estúdio. **Toda a arquitetura já nasce multi-tenant** (coluna `studio_id` em todas as tabelas, RLS por tenant), mas a UI de gerenciamento de múltiplos estúdios fica fora do MVP.

---

## 2. PERFIS DE USUÁRIO (ROLES)

| Role | Descrição | Acessos principais |
|---|---|---|
| `owner` (Gestora) | Dona/administradora do estúdio | Tudo: todas as agendas, financeiro consolidado, cadastro de profissionais/serviços/metas, relatórios, configurações |
| `professional` (Profissional/Parceira) | Manicure parceira do estúdio | Sua própria agenda (editar disponibilidade), seus atendimentos, seus ganhos e projeções, seu histórico |
| `client` (Cliente) | Cliente final do estúdio | Ver horários disponíveis, agendar/cancelar seus próprios horários, ver seu histórico de atendimentos |

Regras de visibilidade:
- Profissional **nunca** vê ganhos de outra profissional.
- Cliente **nunca** vê dados financeiros de ninguém.
- Gestora vê tudo dentro do seu `studio_id`.

---

## 3. STACK TÉCNICA

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Padrão já dominado |
| Estilo | Tailwind CSS | Velocidade + design system consistente |
| Animações | Framer Motion | Animações simples e fluidas (fade, slide, spring) |
| Componentes | shadcn/ui (Radix) | Minimalista, acessível, customizável |
| Estado servidor | TanStack Query (React Query) | Cache, refetch, optimistic updates |
| Backend/DB | Supabase (Postgres + Auth + RLS + Realtime) | Auth pronto, RLS para multi-tenant, realtime na agenda |
| Datas | date-fns + date-fns-tz | Fuso `America/Sao_Paulo` |
| Gráficos | Recharts | Dashboards de faturamento e performance |
| Deploy | Vercel (front) + Supabase (back) | Fluxo já conhecido |
| Ícones | lucide-react | Minimalista |

---

## 4. MODELO DE DADOS (Supabase / Postgres)

Todas as tabelas carregam `studio_id uuid not null` e `created_at timestamptz default now()`. Migrations em `supabase/migrations/` (fonte da verdade — ver arquivos para o SQL completo):

- `studios` — tenant; `settings jsonb` guarda `min_cancel_hours`, `slot_step_minutes`, `opening_hours`.
- `profiles` — 1:1 com `auth.users`; `role in ('owner','professional','client')`.
- `professionals` — dados da profissional: `commission_pct` (percentual base), `bio`, `color` (cor na agenda).
- `services` — catálogo: `price`, `duration_minutes`, `commission_pct_override` (se null, vale o pct da profissional).
- `professional_services` — N:N de quais serviços cada profissional executa.
- `availability_rules` — disponibilidade recorrente semanal (weekday 0=domingo, start/end time).
- `availability_exceptions` — folgas/bloqueios (`type='block'`) ou horários extras (`type='extra'`) por data; block sem horário = dia inteiro.
- `appointments` — núcleo: snapshots de preço/comissão, `scheduled_start/end`, `actual_start/end` (botões Iniciar/Finalizar), `status in ('scheduled','confirmed','in_progress','done','no_show','canceled')`, `client_name_snapshot` para cliente avulsa sem login.
- `earnings` — lançamento gerado por trigger quando appointment vira `done`: `gross_value`, `commission_value`, `studio_value`, `earned_at`.
- `goals` — metas mensais por profissional (`target_type in ('revenue','appointments')`, `bonus_type in ('fixed','extra_pct')`).
- `bonuses` — bônus concedidos no fechamento do mês (`status in ('pending','paid')`).
- `invites` — convites de profissional com token; aceitos via RPC `accept_invite`.
- `activity_log` — auditoria via triggers em appointments, services, availability_*, goals.

### 4.1 Snapshots — regra de ouro
`price_snapshot` e `commission_pct_snapshot` são gravados **no momento do agendamento** e nunca recalculados. Se a gestora mudar o preço do serviço ou o percentual da profissional depois, atendimentos já marcados não mudam. Isso garante histórico financeiro íntegro.

### 4.2 Percentual efetivo de comissão
```
commission_pct efetivo =
  services.commission_pct_override (se não nulo)
  senão professionals.commission_pct
```

---

## 5. SEGURANÇA — RLS (Row Level Security)

RLS ativa em **todas** as tabelas (ver `supabase/migrations/0002_rls.sql`). Helpers security definer: `auth_studio_id()`, `auth_role()`, `auth_professional_id()`, `professional_studio(pid)`.

| Tabela | owner | professional | client |
|---|---|---|---|
| appointments | CRUD no seu studio | CRUD onde `professional_id` é o dela | leitura/insert/cancel onde `client_id = auth.uid()` |
| earnings | leitura total do studio | leitura só das suas | sem acesso |
| goals / bonuses | CRUD | leitura só das suas | sem acesso |
| availability_* | CRUD no studio | CRUD só das suas | leitura (para ver slots livres) |
| services | CRUD | leitura | leitura (só `active = true`) |
| profiles | CRUD no studio | leitura própria + colegas | leitura própria + equipe |
| professionals | CRUD | leitura da própria linha | via view `professionals_public` (sem comissão) |
| activity_log | leitura | leitura das próprias ações | sem acesso |
| invites | CRUD | sem acesso | sem acesso |

Regras extras:
- Cliente vê **slots livres** via RPC `get_busy_times` (só start/end, nunca nome/serviço de terceiros).
- Escritas relevantes disparam insert em `activity_log` via trigger `log_activity()`.
- Todo signup nasce `client` (trigger `handle_new_user`); owner é promovida via SQL, professional via RPC `accept_invite` — evita escalação de privilégio por metadata.

---

## 6. MÓDULOS FUNCIONAIS

### 6.1 Autenticação e onboarding
- Login por e-mail/senha (Supabase Auth). Magic link opcional na v2.
- Primeiro acesso da profissional: convite gerado pela gestora (link `/invite/:token`) → define senha → cai no seu painel.
- Cadastro de cliente: self-service (nome, telefone, e-mail, senha) vinculado ao `studio_id` do estúdio (via `studio_slug` no metadata do signup).

### 6.2 Agenda (coração do sistema)
**Visão da gestora:**
- Calendário do dia/semana com **colunas por profissional** (cada uma com sua cor).
- Criar/editar/cancelar atendimento para qualquer profissional.
- Encaixar cliente avulsa (sem login) digitando só o nome.
- Filtros: profissional, serviço, status.

**Visão da profissional:**
- Sua agenda dia/semana.
- Editor de disponibilidade: grade semanal recorrente + exceções pontuais.
- Botões de fluxo: **Confirmar → Iniciar → Finalizar** (ou No-show). "Iniciar" grava `actual_start`; "Finalizar" grava `actual_end` e dispara a criação do `earning` (trigger).

**Visão da cliente:**
- Escolhe serviço → vê profissionais que o executam → vê slots livres → agenda.
- Pode cancelar respeitando antecedência mínima de `studios.settings` (default 4h).

**Geração de slots:** implementado em `src/lib/slots.ts` (`generateSlots`) com testes:
1. Regras do weekday + exceções `extra` formam a disponibilidade.
2. Subtrai exceções `block` e appointments ativos (`scheduled|confirmed|in_progress`).
3. Fatia em slots do tamanho `duration_minutes` (passo 15 min).
4. Remove slots no passado / que violem antecedência mínima.

### 6.3 Motor de comissões e ganhos
- Trigger `create_earning_on_done`: ao virar `done`, grava `earnings` com `commission_value = round(price_snapshot * commission_pct_snapshot / 100, 2)` e `earned_at = actual_end`. Sair de `done` (correção) apaga o earning.
- Mesmas fórmulas espelhadas em `src/lib/earnings.ts` para projeções na UI.
- **Metas:** barra de progresso no painel; bônus gerado **no fechamento do mês** (botão "Fechar mês" da gestora no MVP).
- **Fechamento mensal:** consolidado por profissional (bruto, comissão, bônus, total a pagar), export CSV.

### 6.4 Previsibilidade de ganhos (diferencial do produto)
Painel da profissional com três números: **Realizado** (earnings do mês) | **Já garantido** (comissão dos agendados futuros) | **Potencial máximo** (slots livres restantes × ticket médio de comissão dos últimos 60 dias; sem histórico, média dos serviços que executa). Barra empilhada + frase de impacto: *"Preencha sua agenda dos próximos 7 dias e ganhe até R$ X a mais."*

### 6.5 Performance e tempo de atendimento
- Duração real (`actual_end - actual_start`) vs. prevista → desvio médio por profissional/serviço.
- Gestora: ocupação (agendadas ÷ disponíveis), no-show, cancelamento, ticket médio, atendimentos/dia, faturamento/dia. Profissional: as mesmas, só dela.

### 6.6 Histórico de ações (activity_log)
Timeline filtrável por período/pessoa/tipo. Gestora vê tudo; profissional vê as próprias ações.

### 6.7 Cadastros (gestora)
Profissionais (dados + percentual + serviços + cor), serviços, metas mensais, configurações do estúdio.

---

## 7. TELAS (mapa de navegação)

```
/login  /signup (cliente)  /invite/:token (profissional)

GESTORA (/admin)
├── /admin/dashboard        → KPIs do estúdio, faturamento do mês, gráfico diário, ocupação
├── /admin/agenda           → calendário multi-profissional (dia/semana)
├── /admin/atendimentos     → lista/histórico com filtros
├── /admin/financeiro       → consolidado, comissões, fechamento de mês, export CSV
├── /admin/profissionais    → CRUD + metas
├── /admin/servicos         → CRUD
├── /admin/historico        → activity_log
└── /admin/configuracoes

PROFISSIONAL (/pro)
├── /pro/dashboard          → ganhos (realizado/agendado/potencial), meta do mês, hoje
├── /pro/agenda             → sua agenda + fluxo iniciar/finalizar
├── /pro/disponibilidade    → grade semanal + exceções
├── /pro/ganhos             → extrato de earnings, bônus
└── /pro/historico          → suas ações e atendimentos

CLIENTE (/app)
├── /app/agendar            → serviço → profissional → slot → confirmar
├── /app/meus-horarios      → futuros (cancelar) e passados
└── /app/perfil
```

Roteamento protegido por role (`ProtectedRoute` + `homePathFor`): após login, redireciona para a área do `profiles.role`.

---

## 8. DESIGN SYSTEM

### 8.1 Direção visual
- **Minimalista e feminino sem ser infantil:** fundo off-white (`#FAFAF8`), cartões brancos com sombra suave, cantos `rounded-2xl`.
- **Cor primária:** roxo/lavanda (`#8B5CF6`) com acentos rosê (`#F0ABFC`) — configurável por estúdio na v2 (SaaS).
- **Tipografia:** Inter (UI) — pesos 400/500/600. Números financeiros em `tabular-nums` (classe `.tnums`).
- **Densidade:** respiro generoso; máximo de 2 níveis de informação por cartão.
- Dark mode fora do MVP.

### 8.2 Animações (Framer Motion — simples e rápidas)
- Fade + slide-up (8px, 150–200ms) em cartões ao montar; contadores animados; barra de meta com spring; slots com `scale 0.98` no press; slide horizontal entre dias.
- **Regra:** nada acima de 250ms, nunca bloquear interação, respeitar `prefers-reduced-motion`.

### 8.3 Componentes-chave
`AgendaGrid`, `SlotPicker`, `EarningsCard`, `GoalProgress`, `AppointmentSheet`, `StatCard`, `Timeline`, `MonthCloseTable`. Base shadcn-style em `src/components/ui/`.

Mobile-first: profissionais e clientes usam majoritariamente pelo celular (shell com bottom nav no mobile, sidebar no desktop — `AppShell`).

---

## 9. ESTRUTURA DE PASTAS

```
caderninho/
├── CLAUDE.md
├── supabase/
│   ├── migrations/               ← SQL versionado (já aplicado no remoto)
│   └── seed.sql                  ← studio demo + serviços (já aplicado)
├── src/
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── slots.ts              ← algoritmo de geração de slots (+ testes)
│   │   └── earnings.ts           ← cálculos de comissão e projeções (+ testes)
│   ├── hooks/                    ← useAppointments, useEarnings, useAvailability...
│   ├── components/
│   │   ├── ui/                   ← button, card, input, label (shadcn-style)
│   │   ├── shared/               ← AppShell, ProtectedRoute
│   │   ├── agenda/
│   │   └── financeiro/
│   ├── pages/
│   │   ├── admin/  ├── pro/  ├── app/  └── auth/
│   ├── contexts/AuthContext.tsx  ← sessão + profile + role
│   └── types/database.ts         ← tipos do domínio
└── .env.example
```

### 9.1 Ambiente — projeto 100% independente

> **Regra de ouro do isolamento:** projeto Supabase próprio + repositório GitHub próprio + projeto Vercel próprio. **Nada compartilhado com AGULHA, RADAR ou qualquer outro projeto.**

- Supabase: projeto `caderninho`, ref `bsbdzemsbaonaopzqldy`, região `sa-east-1` ✅
- `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` ✅ (nunca commitado)
- GitHub: repo novo e privado `caderninho` (pendente — `gh` CLI não instalado)
- Vercel: importar o repo + configurar as duas variáveis `VITE_*` (pendente)

---

## 10. ROADMAP DE IMPLEMENTAÇÃO

### Fase 1 — Fundação ✅
1. ✅ Setup Vite + React + TS + Tailwind + Supabase client.
2. ✅ Migrations completas + RLS + seed.
3. ✅ Auth: login, roteamento por role, AuthContext, convite de profissional.

### Fase 2 — Agenda interna (MVP core) ← PRÓXIMO
4. Editor de disponibilidade da profissional (grade semanal + exceções).
5. ✅ Algoritmo de slots (`lib/slots.ts`) com testes (vitest) — falta integrar na UI.
6. Agenda da gestora (multi-profissional) e da profissional; criar/editar/cancelar atendimento; cliente avulsa.
7. Fluxo Confirmar → Iniciar → Finalizar → No-show, gravando tempos reais.

### Fase 3 — Financeiro
8. ✅ Trigger Postgres de `earnings` ao finalizar.
9. Dashboard da profissional: realizado/agendado/potencial + meta com barra.
10. Dashboard da gestora: KPIs, gráficos, consolidado.
11. Metas + fechamento de mês + geração de bônus + export CSV.

### Fase 4 — Portal da cliente
12. ✅ Signup de cliente — falta fluxo de agendamento, meus horários, cancelamento com antecedência.

### Fase 5 — Performance e histórico
13. Métricas de tempo real vs. previsto, ocupação, no-show.
14. ✅ Triggers de activity_log — falta timeline na UI.

### Fase 6 — Polimento
15. Animações Framer Motion, estados vazios, skeletons, responsividade completa.
16. Realtime na agenda (Supabase Realtime).

### Pós-MVP (v2 / SaaS)
- Notificações WhatsApp (Evolution API), onboarding self-service de estúdios, planos/billing, tema por estúdio, PDF mensal, pacotes de fidelidade.

---

## 11. REGRAS DE NEGÓCIO — RESUMO EXECUTIVO

1. Preço e percentual são **congelados** no agendamento (snapshots).
2. `earning` só existe para atendimento `done`; cancelado/no-show não gera comissão.
3. Meta batida gera bônus **no fechamento do mês**, nunca antes.
4. Slot ocupado nunca revela dados de terceiros para clientes.
5. Antecedência mínima de cancelamento vem de `studios.settings` (default 4h).
6. Toda mudança relevante vira linha no `activity_log`.
7. Fuso horário fixo `America/Sao_Paulo`; gravar `timestamptz` no banco.
8. Multi-tenant desde o dia 1: nenhuma query sem filtro por `studio_id` (RLS garante, mas o código também filtra explicitamente).

---

## 12. CRITÉRIOS DE ACEITE DO MVP

- [ ] Gestora cadastra profissional, serviços e metas.
- [ ] Profissional define disponibilidade e vê apenas sua agenda/ganhos.
- [ ] Cliente com login agenda e cancela dentro das regras.
- [x] Atendimento finalizado gera comissão correta automaticamente (trigger testado).
- [ ] Painel da profissional mostra realizado + agendado + potencial do mês.
- [ ] Fechamento de mês consolida comissões e bônus, exporta CSV.
- [ ] Tempo real de atendimento registrado e comparado ao previsto.
- [ ] Nenhum vazamento de dados entre roles (testar RLS com usuários de cada tipo).
- [ ] Interface fluida no celular.

---

*Documento vivo — atualizar conforme decisões forem tomadas durante o desenvolvimento.*
