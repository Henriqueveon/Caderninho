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
const uid = (await owner.auth.getUser()).data.user.id;
const { data: me } = await owner.from("profiles").select("studio_id").eq("id", uid).single();

// 1. get_team retorna a equipe com e-mail e serviços
const { data: team, error: teamErr } = await owner.rpc("get_team");
if (teamErr) no(`get_team: ${teamErr.message}`);
else ok(`get_team → ${team.length} membros: ${team.map((m) => m.full_name).join(", ")}`);
const pat = team?.find((m) => m.full_name === "Patrícia");
pat?.email && pat.service_ids.length > 0
  ? ok(`Patrícia: ${pat.email}, ${pat.service_ids.length} serviços, ${pat.commission_pct}%`)
  : no("dados da Patrícia incompletos");

// 2. salvar profissional (no-op) — exercita as 3 escritas do useSaveProfessional
{
  const r1 = await owner.from("profiles").update({ full_name: pat.full_name, phone: pat.phone }).eq("id", pat.profile_id);
  const r2 = await owner.from("professionals").update({ commission_pct: pat.commission_pct, color: pat.color, bio: pat.bio, active: pat.active }).eq("id", pat.professional_id);
  const r3 = await owner.from("professional_services").delete().eq("professional_id", pat.professional_id);
  const r4 = await owner.from("professional_services").insert(pat.service_ids.map((sid) => ({ professional_id: pat.professional_id, service_id: sid })));
  [r1, r2, r3, r4].some((r) => r.error)
    ? no(`salvar profissional: ${[r1, r2, r3, r4].find((r) => r.error).error.message}`)
    : ok("salvar profissional (perfil + comissão + serviços) OK");
}

// 3. criar convite → revogar
{
  const { data: inv, error } = await owner.from("invites")
    .insert({ studio_id: me.studio_id, email: "nova@teste.vb", full_name: "Nova Parceira", role: "professional", commission_pct: 45 })
    .select("token, id").single();
  if (error) no(`criar convite: ${error.message}`);
  else {
    ok(`convite criado (token ${inv.token.slice(0, 8)})`);
    const { error: eDel } = await owner.from("invites").delete().eq("id", inv.id);
    eDel ? no(`revogar: ${eDel.message}`) : ok("convite revogado");
  }
}

// 4. não-owner é bloqueada no get_team
{
  const patC = await login("patricia@esmalteria.vb");
  const { error } = await patC.rpc("get_team");
  error ? ok(`Patrícia bloqueada de get_team: "${error.message}"`) : no("VAZAMENTO: profissional chamou get_team");
}

console.log(`\n${fail === 0 ? "TUDO OK" : "FALHAS"} — ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
