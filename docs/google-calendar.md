# Integração com Google Agenda

> Status: **planejado**. Depende de credenciais OAuth que só você pode criar no Google Cloud.
> A agenda interna já funciona sem isso; o Google Calendar é uma camada de sincronização por cima.

## O que a integração faz

Cada profissional conecta a própria conta Google uma vez. A partir daí, todo
atendimento criado/alterado/cancelado no Caderninho vira um **evento na Google
Agenda dela** — e ela recebe as notificações e lembretes nativos do Google no
celular, sem precisar abrir o Caderninho. A gestora/secretária agendam, e cai
direto no Google da menina.

Sincronização é **um sentido** (Caderninho → Google) no MVP. Isso evita
conflitos e mantém o Caderninho como fonte da verdade.

## Arquitetura

```
Profissional clica "Conectar Google Agenda"
        │  (OAuth consent — escopo calendar.events)
        ▼
Edge Function  google-oauth-callback   → troca code por refresh_token
        │                                 e guarda em google_calendar_connections
        ▼
Atendimento muda de status/horário
        │  (trigger no Postgres → chamada à Edge Function, ou chamada direta do app)
        ▼
Edge Function  sync-calendar-event      → cria/atualiza/remove o evento
                                          na agenda da profissional
```

Duas Edge Functions (Deno, hospedadas no próprio Supabase):
1. `google-oauth-callback` — recebe o `code` do Google, troca por `refresh_token`,
   grava criptografado.
2. `sync-calendar-event` — usa o `refresh_token` para pegar um access token e
   fazer o upsert/delete do evento via Google Calendar API.

Tabela nova (a criar quando formos implementar):
```sql
create table google_calendar_connections (
  professional_id uuid primary key references professionals(id) on delete cascade,
  studio_id uuid not null references studios(id),
  google_email text,
  refresh_token text not null,   -- via Supabase Vault / pgsodium
  calendar_id text default 'primary',
  connected_at timestamptz default now()
);
-- + coluna appointments.google_event_id text  (para atualizar/remover o evento certo)
```

## O que VOCÊ precisa providenciar (uma vez)

1. Criar um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. **APIs & Services → Enable APIs** → habilitar **Google Calendar API**.
3. **OAuth consent screen** → tipo *External*, adicionar o escopo
   `.../auth/calendar.events`, publicar (ou deixar em teste com as profissionais
   como testers).
4. **Credentials → Create OAuth client ID** → tipo *Web application*.
   - Authorized redirect URI: a URL da Edge Function de callback
     (`https://bsbdzemsbaonaopzqldy.supabase.co/functions/v1/google-oauth-callback`).
5. Me passar o **Client ID** e o **Client Secret**.
   - O Client ID pode ir no `.env` do front; o **Client Secret** eu guardo como
     *secret* da Edge Function no Supabase (nunca no repositório).

Com isso em mãos, implemento as duas Edge Functions, a tabela, o botão
"Conectar Google Agenda" no painel da profissional e o gancho de sincronização
no fluxo de atendimento.

## Alternativa mais simples (se quiser adiar o OAuth)

Um arquivo **.ics** por atendimento (link "Adicionar ao meu calendário") ou um
feed .ics público por profissional. Não gera notificação automática nem
sincroniza mudanças, mas não exige OAuth nem aprovação do Google. Serve como
ponte enquanto o OAuth não está pronto.
