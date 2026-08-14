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

    // DELETE direto tem de ser barrado: a única porta é o RPC, que checa
    // se o serviço já foi usado antes de deixar apagar.
    await c.from("services").delete().eq("id", svc.id);
    const { data: still } = await c.from("services").select("id").eq("id", svc.id);
    check("DELETE direto em serviço é barrado", (still ?? []).length === 1);

    const { error: rpcErr } = await c.rpc("remove_service", { p_service_id: svc.id });
    check("exclui serviço pelo RPC", !rpcErr, rpcErr?.message);
  }

  // O RPC não pode apagar serviço que já aparece em atendimento (nem como
  // item extra de um multi-serviço).
  const { data: usados } = await c
    .from("appointment_items")
    .select("service_id")
    .not("service_id", "is", null)
    .limit(1);
  if (usados?.length) {
    const { error: guardErr } = await c.rpc("remove_service", {
      p_service_id: usados[0].service_id,
    });
    check("serviço já usado NÃO pode ser excluído", !!guardErr);
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

  if (cli) {
    // Excluir cadastro de cliente é só da gestora — apagar desliga o histórico
    // dos atendimentos dela (FK on delete set null).
    await c.from("clients").delete().eq("id", cli.id);
    const { data: left } = await c.from("clients").select("id").eq("id", cli.id);
    if (me.role === "owner") {
      check("exclui cadastro de cliente", (left ?? []).length === 0);
    } else {
      check("NÃO exclui cadastro de cliente", (left ?? []).length === 1);
      await c.from("clients").update({ full_name: "__smoke editado" }).eq("id", cli.id);
      const { data: ed } = await c.from("clients").select("full_name").eq("id", cli.id);
      check("edita cadastro de cliente", ed?.[0]?.full_name === "__smoke editado");
    }
  }

  // DINHEIRO: a secretária não pode ver nada
  const { data: earn } = await c.from("earnings").select("id").limit(1);
  const { data: pay } = await c.from("payments").select("id").limit(1);
  const seesMoney = (earn ?? []).length > 0 || (pay ?? []).length > 0;
  if (me.role === "secretary") {
    check("NÃO vê comissões nem pagamentos", !seesMoney);
  } else {
    check("vê as próprias comissões", (earn ?? []).length > 0);
  }

  // Saldo acumulado: vem somado do banco, imune ao corte de 1000 linhas.
  const { data: bal, error: balErr } = await c.rpc("get_balances");
  if (me.role === "secretary") {
    check("NÃO recebe saldo de ninguém", !balErr && (bal ?? []).length === 0);
  } else {
    check(
      me.role === "owner" ? "recebe o saldo da equipe" : "recebe só o próprio saldo",
      !balErr && (bal ?? []).length === (me.role === "owner" ? 3 : 1),
      `${(bal ?? []).length} linha(s)`,
    );
  }

  await c.auth.signOut();
}

await run("victoriabatista@esmalteria.vb", "gestora");
await run("kimberly@esmalteria.vb", "profissional");
await run("secretaria@esmalteria.vb", "secretária");

console.log(fails === 0 ? "\nTudo certo." : `\n${fails} falha(s).`);
process.exit(fails === 0 ? 0 : 1);
