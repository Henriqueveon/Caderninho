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

const wide = new Date(); wide.setDate(wide.getDate() - 40);
const sel = "id, professional_id, gross_value, commission_value, studio_value, earned_at, appointment:appointment_id(client_name_snapshot, service:service_id(name))";

// 1. gestora vê todos os earnings + embed do serviço funciona
const owner = await login("victoriabatista@esmalteria.vb");
{
  const { data, error } = await owner.from("earnings").select(sel).gte("earned_at", wide.toISOString());
  if (error) { no(`owner earnings: ${error.message}`); process.exit(1); }
  const gross = data.reduce((s, e) => s + Number(e.gross_value), 0);
  ok(`gestora vê ${data.length} earnings, bruto R$${gross.toFixed(2)}`);
  const withName = data.find((e) => e.appointment?.service?.name);
  withName ? ok(`embed extrato OK (ex: ${withName.appointment.service.name})`) : no("embed do serviço vazio");
}

// 2. Patrícia só vê os próprios earnings
const pat = await login("patricia@esmalteria.vb");
let patGross = 0;
{
  const { data } = await pat.from("earnings").select("professional_id, gross_value, commission_value, earned_at").gte("earned_at", wide.toISOString());
  const { data: me } = await pat.rpc("get_bookable_professionals");
  const myId = me.find((p) => p.full_name === "Patrícia").id;
  const onlyMine = data.every((e) => e.professional_id === myId);
  patGross = data.reduce((s, e) => s + Number(e.gross_value), 0);
  onlyMine && data.length > 0
    ? ok(`Patrícia vê só os ${data.length} earnings dela (bruto R$${patGross.toFixed(2)})`)
    : no(`isolamento falhou (onlyMine=${onlyMine}, n=${data.length})`);
}

// 3. realizado do mês (comissão) para a Patrícia
{
  const first = new Date(); first.setDate(1); first.setHours(0,0,0,0);
  const { data } = await pat.from("earnings").select("commission_value").gte("earned_at", first.toISOString());
  const realizado = data.reduce((s, e) => s + Number(e.commission_value), 0);
  ok(`realizado do mês (Patrícia): R$${realizado.toFixed(2)}`);
}

// 4. secretária NÃO vê faturamento
const sec = await login("secretaria@esmalteria.vb");
{
  const { data } = await sec.from("earnings").select("id").gte("earned_at", wide.toISOString());
  (data?.length ?? 0) === 0 ? ok("secretária bloqueada de earnings") : no("VAZAMENTO: secretária vê earnings");
}

console.log(`\n${fail === 0 ? "TUDO OK" : "FALHAS"} — ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
