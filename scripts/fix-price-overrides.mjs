// Limpa overrides de preço/duração em professional_services (equivale à
// migration 0018, aplicada via login da gestora quando o SQL Editor não está
// à mão). Por padrão só MOSTRA o que faria.
//
//   node scripts/fix-price-overrides.mjs            → relatório (dry-run)
//   node scripts/fix-price-overrides.mjs --apply    → zera overrides IGUAIS ao catálogo
//   node scripts/fix-price-overrides.mjs --apply --all
//        → zera TODOS os overrides (todas passam a seguir o catálogo; use só se
//          nenhuma profissional deve ter preço próprio)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const APPLY = process.argv.includes("--apply");
const ALL = process.argv.includes("--all");
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "victoriabatista@esmalteria.vb";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "102030";

const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const { error: le } = await c.auth.signInWithPassword({ email: OWNER_EMAIL, password: OWNER_PASSWORD });
if (le) throw new Error(`login: ${le.message}`);

const q1 = await c.from("services").select("id, name, price, duration_minutes");
const q2 = await c.rpc("get_team");
const q3 = await c.from("professional_services").select("professional_id, service_id, price, duration_minutes");
for (const [n, q] of [["services", q1], ["get_team", q2], ["professional_services", q3]]) {
  if (q.error) throw new Error(`${n}: ${q.error.message}`);
}
const sById = new Map(q1.data.map((s) => [s.id, s]));
const pName = new Map(q2.data.map((m) => [m.professional_id, m.full_name]));

const plan = [];
for (const r of q3.data) {
  const s = sById.get(r.service_id);
  if (!s) continue;
  const priceEq = r.price != null && Number(r.price) === Number(s.price);
  const durEq = r.duration_minutes != null && r.duration_minutes === s.duration_minutes;
  const clearPrice = r.price != null && (ALL || priceEq);
  const clearDur = r.duration_minutes != null && (ALL || durEq);
  if (!clearPrice && !clearDur) continue;
  plan.push({ r, s, clearPrice, clearDur });
}

console.log(`${APPLY ? "APLICANDO" : "DRY-RUN"} (${ALL ? "todos os overrides" : "só os iguais ao catálogo"}): ${plan.length} linhas`);
for (const { r, s, clearPrice, clearDur } of plan) {
  const parts = [];
  if (clearPrice) parts.push(`preço R$${r.price} → catálogo R$${s.price}`);
  if (clearDur) parts.push(`duração ${r.duration_minutes} → catálogo ${s.duration_minutes}min`);
  console.log(`  ${(pName.get(r.professional_id) ?? "?").padEnd(18)} ${s.name.padEnd(40)} ${parts.join(" | ")}`);
}
if (!APPLY) { console.log("\nNada alterado. Rode com --apply para gravar."); process.exit(0); }

let ok = 0;
for (const { r, clearPrice, clearDur } of plan) {
  const patch = {};
  if (clearPrice) patch.price = null;
  if (clearDur) patch.duration_minutes = null;
  const { error } = await c.from("professional_services").update(patch)
    .eq("professional_id", r.professional_id).eq("service_id", r.service_id);
  if (error) { console.error("  ✗", pName.get(r.professional_id), r.service_id, error.message); continue; }
  ok++;
}
console.log(`\n${ok}/${plan.length} linhas atualizadas.`);
