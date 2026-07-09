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
  return { c, error };
};
let pass = 0, fail = 0;
const ok = (m) => (pass++, console.log("  ✓", m));
const no = (m) => (fail++, console.log("  ✗", m));

const { c: owner } = await login("victoriabatista@esmalteria.vb");
let { data: team } = await owner.rpc("get_team");

// 1. remover Ana e Bruna (inativas, sem histórico) → apaga de vez
for (const nome of ["Ana Souza", "Bruna Lima"]) {
  const m = team.find((x) => x.full_name === nome);
  if (!m) { no(`${nome} não encontrada`); continue; }
  const { data, error } = await owner.rpc("remove_team_member", { p_professional_id: m.professional_id });
  error ? no(`remover ${nome}: ${error.message}`) : ok(`${nome} removida (${data})`);
}

// 2. login da Ana deve falhar (conta apagada)
{
  const { error } = await login("ana@esmalteria.vb");
  error ? ok("login da Ana falha (conta apagada)") : no("Ana ainda consegue logar");
}

// 3. get_team agora só com o elenco real
({ data: team } = await owner.rpc("get_team"));
const nomes = team.map((m) => m.full_name).sort().join(", ");
nomes === "Kimberly, Patrícia, Victoria Batista"
  ? ok(`equipe limpa: ${nomes}`)
  : no(`equipe inesperada: ${nomes}`);

// 4. bloqueio por histórico: agenda p/ Kimberly, tenta remover
{
  const kim = team.find((m) => m.full_name === "Kimberly");
  const { data: svc } = await owner.from("services").select("id").limit(1);
  const d = new Date(); d.setHours(15, 0, 0, 0);
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  const { data: apptId, error: bErr } = await owner.rpc("book_appointment", {
    p_professional_id: kim.professional_id, p_service_id: svc[0].id,
    p_scheduled_start: d.toISOString(), p_client_name: "Hist Teste",
  });
  if (bErr) { no(`setup booking: ${bErr.message}`); }
  else {
    const { error } = await owner.rpc("remove_team_member", { p_professional_id: kim.professional_id });
    error && /hist/i.test(error.message)
      ? ok(`remover com histórico bloqueado: "${error.message.slice(0, 50)}…"`)
      : no(`deveria bloquear por histórico (${error?.message ?? "sem erro"})`);
    await owner.from("appointments").delete().eq("id", apptId);
    ({ data: team } = await owner.rpc("get_team"));
    team.find((m) => m.full_name === "Kimberly") ? ok("Kimberly preservada após bloqueio") : no("Kimberly sumiu");
  }
}

console.log(`\n${fail === 0 ? "TUDO OK" : "FALHAS"} — ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
