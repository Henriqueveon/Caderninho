// Verificação end-to-end da lógica real do app (mesmo caminho do AuthContext).
// Roda contra o Supabase real usando o mesmo cliente/anon key do frontend.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
);

const homePathFor = (role) =>
  role === "owner"
    ? "/admin/dashboard"
    : role === "professional"
      ? "/pro/dashboard"
      : "/app/agendar";

let pass = 0;
let fail = 0;
const ok = (m) => (pass++, console.log("  ✓", m));
const no = (m) => (fail++, console.log("  ✗", m));

// 1. Login da gestora (LoginPage.handleSubmit)
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
  email: "victoriabatista@esmalteria.vb",
  password: "102030",
});
if (authErr) no(`login: ${authErr.message}`);
else ok(`login da gestora (user ${auth.user.email})`);

// 2. Busca do profile (AuthContext.fetchProfile)
const { data: profile, error: profErr } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", auth.user.id)
  .single();
if (profErr) no(`profile: ${profErr.message}`);
else ok(`profile carregado: ${profile.full_name} / role=${profile.role}`);

// 3. Roteamento por role (homePathFor)
const route = homePathFor(profile.role);
route === "/admin/dashboard"
  ? ok(`roteia gestora para ${route}`)
  : no(`rota inesperada: ${route}`);

// 4. Dados que o painel da gestora lê (RLS deixa owner ver o studio + servicos)
const { data: services, error: svcErr } = await supabase
  .from("services")
  .select("name, price, duration_minutes")
  .order("price");
if (svcErr) no(`services: ${svcErr.message}`);
else ok(`gestora ve ${services.length} servicos (ex: ${services[0]?.name} R$${services[0]?.price})`);

// 5. RPC de profissionais agendaveis (usado no fluxo da cliente)
const { error: rpcErr } = await supabase.rpc("get_bookable_professionals");
if (rpcErr) no(`rpc get_bookable_professionals: ${rpcErr.message}`);
else ok("rpc get_bookable_professionals responde");

// 6. Isolamento: dados de outra tabela sensivel exigem contexto correto
const { data: earnings, error: earnErr } = await supabase
  .from("earnings")
  .select("id");
if (earnErr) no(`earnings: ${earnErr.message}`);
else ok(`earnings acessivel pela owner (${earnings.length} lancamentos)`);

await supabase.auth.signOut();

console.log(`\n${fail === 0 ? "TUDO OK" : "FALHAS"} — ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
