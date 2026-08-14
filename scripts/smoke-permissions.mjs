// Smoke das permissões novas (0016): profissional e secretária cadastram
// serviço e cliente; secretária continua sem enxergar dinheiro.
// Uso: node scripts/smoke-permissions.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;

const PASS = "102030";
let fails = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "  ok " : "FAIL "} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) fails++;
};

async function login(email) {
  const c = createClient(URL, KEY);
  const { error } = await c.auth.signInWithPassword({ email, password: PASS });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  const { data: auth } = await c.auth.getUser();
  const { data: me } = await c
    .from("profiles")
    .select("id, role, studio_id")
    .eq("id", auth.user.id)
    .single();
  return { c, me };
}

async function run(email, label) {
  console.log(`\n== ${label} (${email})`);
  const { c, me } = await login(email);

  // SERVIÇO: criar, editar, apagar
  const { data: svc, error: insErr } = await c
    .from("services")
    .insert({
      studio_id: me.studio_id,
      name: `__smoke ${label} ${Date.now()}`,
      price: 10,
      duration_minutes: 30,
      active: false,
    })
    .select()
    .single();
  check("cria serviço", !insErr, insErr?.message);

  if (svc) {
    const { error: updErr } = await c
      .from("services")
      .update({ price: 20 })
      .eq("id", svc.id);
    check("edita preço do serviço", !updErr, updErr?.message);

    const { data: log } = await c
      .from("activity_log")
      .select("action, actor_id")
      .eq("entity_id", svc.id)
      .order("created_at", { ascending: false });
    check(
      "ação registrada no histórico com autor",
      (log ?? []).length >= 2 && log[0].actor_id === me.id,
      `${(log ?? []).length} linhas`,
    );

    const { error: rpcErr } = await c.rpc("remove_service", { p_service_id: svc.id });
    check("exclui serviço", !rpcErr, rpcErr?.message);
  }

  // CLIENTE: criar + listar com estatísticas
  const { data: cli, error: cliErr } = await c
    .from("clients")
    .insert({ studio_id: me.studio_id, full_name: `__smoke ${label}` })
    .select()
    .single();
  check("cadastra cliente", !cliErr, cliErr?.message);

  const { error: statsErr } = await c.rpc("get_clients_with_stats");
  check("lê lista de clientes com estatísticas", !statsErr, statsErr?.message);

  if (cli) await c.from("clients").delete().eq("id", cli.id);

  // DINHEIRO: a secretária não pode ver nada
  const { data: earn } = await c.from("earnings").select("id").limit(1);
  const { data: pay } = await c.from("payments").select("id").limit(1);
  const seesMoney = (earn ?? []).length > 0 || (pay ?? []).length > 0;
  if (me.role === "secretary") {
    check("NÃO vê comissões nem pagamentos", !seesMoney);
  } else {
    check("vê as próprias comissões", (earn ?? []).length > 0);
  }

  await c.auth.signOut();
}

await run("kimberly@esmalteria.vb", "profissional");
await run("secretaria@esmalteria.vb", "secretária");

console.log(fails === 0 ? "\nTudo certo." : `\n${fails} falha(s).`);
process.exit(fails === 0 ? 0 : 1);
