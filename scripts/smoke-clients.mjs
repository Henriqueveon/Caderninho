import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const client = () => createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const login = async (email) => {
  const c = client();
  const { error } = await c.auth.signInWithPassword({ email, password: "102030" });
  if (error) throw new Error(error.message);
  return c;
};
let pass = 0, fail = 0;
const ok = (m) => (pass++, console.log("  ✓", m));
const no = (m) => (fail++, console.log("  ✗", m));

const owner = await login("victoriabatista@esmalteria.vb");

// 1. lista de clientes com stats
const { data: stats, error: sErr } = await owner.rpc("get_clients_with_stats");
if (sErr) { no(`get_clients_with_stats: ${sErr.message}`); }
else {
  ok(`${stats.length} clientes com stats`);
  const mari = stats.find((c) => c.full_name === "Mariana Alves");
  mari && mari.done === 7 && mari.no_show === 1 && mari.upcoming === 1
    ? ok(`Mariana: ${mari.done} visitas, ${mari.no_show} falta, ${mari.upcoming} futuro (presença ${Math.round(mari.done/(mari.done+mari.no_show)*100)}%)`)
    : no(`stats da Mariana inesperados: ${JSON.stringify(mari)}`);
}

// 2. cadastrar cliente + agendar vinculado + ver refletir no histórico
{
  const { data: c, error } = await owner.from("clients")
    .insert({ studio_id: (await owner.from("profiles").select("studio_id").eq("id", (await owner.auth.getUser()).data.user.id).single()).data.studio_id, full_name: "Cliente Smoke", phone: "(51) 90000-0000" })
    .select("id").single();
  if (error) { no(`criar cliente: ${error.message}`); }
  else {
    ok("cliente cadastrada");
    const { data: pros } = await owner.rpc("get_bookable_professionals");
    const pat = pros.find((p) => p.full_name === "Patrícia");
    const { data: svc } = await owner.from("services").select("id").eq("active", true).limit(1);
    const d = new Date(); d.setHours(16, 0, 0, 0);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    const { data: apptId, error: bErr } = await owner.rpc("book_appointment", {
      p_professional_id: pat.id, p_service_id: svc[0].id, p_scheduled_start: d.toISOString(),
      p_client_record_id: c.id,
    });
    if (bErr) { no(`agendar vinculado: ${bErr.message}`); }
    else {
      const { data: a } = await owner.from("appointments").select("client_record_id, client_name_snapshot").eq("id", apptId).single();
      a.client_record_id === c.id && a.client_name_snapshot === "Cliente Smoke"
        ? ok("atendimento vinculou à ficha e congelou o nome")
        : no(`vínculo incorreto: ${JSON.stringify(a)}`);
      // limpa
      await owner.from("appointments").delete().eq("id", apptId);
    }
    await owner.from("clients").delete().eq("id", c.id);
    ok("cliente removida (cleanup)");
  }
}

// 3. profissional lê clientes (p/ agendar) mas NÃO a lista com stats
{
  const pat = await login("patricia@esmalteria.vb");
  const { data: opts, error: oErr } = await pat.from("clients").select("id, full_name").limit(1);
  !oErr && Array.isArray(opts) ? ok("profissional lê clientes para agendar") : no(`profissional sem leitura: ${oErr?.message}`);
  const { error: rErr } = await pat.rpc("get_clients_with_stats");
  rErr ? ok(`profissional bloqueada da lista com stats: "${rErr.message.slice(0,40)}…"`) : no("VAZAMENTO: profissional viu stats");
}

console.log(`\n${fail === 0 ? "TUDO OK" : "FALHAS"} — ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
