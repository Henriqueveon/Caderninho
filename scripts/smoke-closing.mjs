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
const studioId = (await owner.from("profiles").select("studio_id").eq("id", (await owner.auth.getUser()).data.user.id).single()).data.studio_id;
const { data: pros } = await owner.rpc("get_bookable_professionals");
const pat = pros.find((p) => p.full_name === "Patrícia");
const kim = pros.find((p) => p.full_name === "Kimberly");

const now = new Date();
const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

// 1. cria metas do mês (persistem p/ demo): Patrícia faturamento, Kimberly atendimentos
{
  const { error } = await owner.from("goals").upsert([
    { studio_id: studioId, professional_id: pat.id, month: key, target_type: "revenue", target_value: 400, bonus_type: "fixed", bonus_value: 100 },
    { studio_id: studioId, professional_id: kim.id, month: key, target_type: "appointments", target_value: 3, bonus_type: "extra_pct", bonus_value: 5 },
  ], { onConflict: "professional_id,month,target_type" });
  error ? no(`criar metas: ${error.message}`) : ok("metas do mês criadas (Patrícia R$400 / Kimberly 3 atend.)");
}

// 2. replica a lógica do fechamento (useCloseMonth) e insere bônus
const { data: goals } = await owner.from("goals").select("*").eq("month", key);
const { data: earn } = await owner.from("earnings").select("professional_id, gross_value").gte("earned_at", mStart).lt("earned_at", mEnd);
const byPro = new Map();
for (const e of earn) { const c = byPro.get(e.professional_id) ?? { gross: 0, count: 0 }; c.gross += Number(e.gross_value); c.count += 1; byPro.set(e.professional_id, c); }
const { data: existing } = await owner.from("bonuses").select("goal_id").eq("month", key);
const done = new Set(existing.map((b) => b.goal_id));
const rows = [];
for (const g of goals) {
  if (done.has(g.id)) continue;
  const st = byPro.get(g.professional_id) ?? { gross: 0, count: 0 };
  const realized = g.target_type === "revenue" ? st.gross : st.count;
  if (realized < g.target_value) continue;
  const value = g.bonus_type === "fixed" ? g.bonus_value : Math.round((g.bonus_value / 100) * st.gross * 100) / 100;
  rows.push({ studio_id: studioId, professional_id: g.professional_id, goal_id: g.id, month: key, value, status: "pending" });
}
{
  const { error } = await owner.from("bonuses").insert(rows);
  rows.length >= 2 && !error
    ? ok(`fechamento gerou ${rows.length} bônus (ex: Patrícia fixo R$${rows.find(r=>r.professional_id===pat.id)?.value}, Kimberly 5% = R$${rows.find(r=>r.professional_id===kim.id)?.value})`)
    : no(`fechamento: ${error?.message ?? rows.length + " bônus"}`);
}

// 3. idempotência: rodar de novo não duplica
{
  const { data: ex2 } = await owner.from("bonuses").select("goal_id").eq("month", key);
  const done2 = new Set(ex2.map((b) => b.goal_id));
  const again = goals.filter((g) => !done2.has(g.id));
  again.length === 0 ? ok("idempotente — nada a gerar na 2ª vez") : no(`duplicaria ${again.length}`);
}

// 4. marcar pago
{
  const { data: b } = await owner.from("bonuses").select("id").eq("month", key).limit(1).single();
  await owner.from("bonuses").update({ status: "paid" }).eq("id", b.id);
  const { data: chk } = await owner.from("bonuses").select("status").eq("id", b.id).single();
  chk.status === "paid" ? ok("bônus marcado como pago") : no("marcar pago falhou");
}

// 5. RLS: secretária não vê bônus; profissional vê só o seu
{
  const sec = await login("secretaria@esmalteria.vb");
  const { data: sb } = await sec.from("bonuses").select("id").eq("month", key);
  (sb?.length ?? 0) === 0 ? ok("secretária bloqueada de bônus") : no("VAZAMENTO: secretária vê bônus");
  const patC = await login("patricia@esmalteria.vb");
  const { data: pb } = await patC.from("bonuses").select("professional_id").eq("month", key);
  (pb ?? []).every((x) => x.professional_id === pat.id) ? ok("Patrícia vê só os próprios bônus") : no("VAZAMENTO: Patrícia vê bônus de outra");
}

// cleanup dos bônus (mantém as metas p/ o usuário clicar "Fechar mês" na UI)
await owner.from("bonuses").delete().eq("month", key);
ok("bônus de teste removidos (metas mantidas p/ demo)");

console.log(`\n${fail === 0 ? "TUDO OK" : "FALHAS"} — ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
