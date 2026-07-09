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
const { data: me } = await owner.from("profiles").select("studio_id").eq("id", (await owner.auth.getUser()).data.user.id).single();

// SERVIÇOS
// 1. criar serviço novo
const { data: svc, error: cErr } = await owner.from("services")
  .insert({ studio_id: me.studio_id, name: "Serviço Teste", price: 99.9, duration_minutes: 40 })
  .select("id").single();
cErr ? no(`criar serviço: ${cErr.message}`) : ok("serviço criado");

// 2. editar preço
if (svc) {
  const { error } = await owner.from("services").update({ price: 120 }).eq("id", svc.id);
  const { data: check } = await owner.from("services").select("price").eq("id", svc.id).single();
  !error && Number(check.price) === 120 ? ok("preço editado (R$120)") : no("edição de preço falhou");
}

// 3. excluir serviço SEM histórico → deleta
if (svc) {
  const { data, error } = await owner.rpc("remove_service", { p_service_id: svc.id });
  error ? no(`excluir: ${error.message}`) : ok(`serviço sem histórico excluído (${data})`);
}

// 4. excluir serviço COM histórico → bloqueado
{
  const { data: used } = await owner.from("appointments").select("service_id").limit(1).single();
  if (used?.service_id) {
    const { error } = await owner.rpc("remove_service", { p_service_id: used.service_id });
    error && /atendimentos/i.test(error.message)
      ? ok(`excluir serviço usado bloqueado: "${error.message.slice(0,45)}…"`)
      : no(`deveria bloquear (${error?.message ?? "sem erro"})`);
  } else no("sem serviço com histórico para testar");
}

// METAS
const { data: pros } = await owner.rpc("get_bookable_professionals");
const pat = pros.find((p) => p.full_name === "Patrícia");
const monthK = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-01`;

// 5. upsert de meta (cria)
{
  const { error } = await owner.from("goals").upsert(
    [{ studio_id: me.studio_id, professional_id: pat.id, month: monthK, target_type: "revenue", target_value: 5000, bonus_type: "fixed", bonus_value: 300 }],
    { onConflict: "professional_id,month,target_type" });
  error ? no(`criar meta: ${error.message}`) : ok("meta criada (R$5000 / bônus R$300)");
}
// 6. upsert de novo (atualiza, não duplica)
{
  await owner.from("goals").upsert(
    [{ studio_id: me.studio_id, professional_id: pat.id, month: monthK, target_type: "revenue", target_value: 6000, bonus_type: "fixed", bonus_value: 400 }],
    { onConflict: "professional_id,month,target_type" });
  const { data } = await owner.from("goals").select("id, target_value").eq("professional_id", pat.id).eq("month", monthK).eq("target_type", "revenue");
  data.length === 1 && Number(data[0].target_value) === 6000
    ? ok("upsert substituiu a meta (sem duplicar)")
    : no(`upsert duplicou/ falhou (${data.length} linhas)`);
  // limpa
  await owner.from("goals").delete().eq("professional_id", pat.id).eq("month", monthK);
}

// 7. profissional NÃO cria meta (RLS owner-only)
{
  const patC = await login("patricia@esmalteria.vb");
  const { error } = await patC.from("goals").insert({ studio_id: me.studio_id, professional_id: pat.id, month: monthK, target_type: "appointments", target_value: 10, bonus_type: "fixed", bonus_value: 100 });
  error ? ok("profissional bloqueada de criar meta") : no("VAZAMENTO: profissional criou meta");
}

console.log(`\n${fail === 0 ? "TUDO OK" : "FALHAS"} — ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
