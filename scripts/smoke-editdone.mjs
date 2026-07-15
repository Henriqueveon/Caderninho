import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
await c.auth.signInWithPassword({ email: "victoriabatista@esmalteria.vb", password: "102030" });
let pass = 0, fail = 0;
const ok = (m) => (pass++, console.log("  ✓", m));
const no = (m) => (fail++, console.log("  ✗", m));

const { data: pros } = await c.rpc("get_bookable_professionals");
const pat = pros.find((p) => p.full_name === "Patrícia");
const kim = pros.find((p) => p.full_name === "Kimberly");
const { data: svcs } = await c.from("services").select("id, name").eq("active", true);
const gel = svcs.find((s) => s.name === "Esmaltação em gel");   // Pati 80/90, Kim 80/90
const mani = svcs.find((s) => s.name === "Manicure");           // 40/60

const d = new Date(); d.setHours(11, 0, 0, 0);
while (d.getDay() !== 1) d.setDate(d.getDate() + 1);

// cria + conclui um atendimento (Patrícia / Manicure 40, PIX)
const { data: id } = await c.rpc("book_appointment", { p_professional_id: pat.id, p_service_id: mani.id, p_scheduled_start: d.toISOString(), p_client_name: "Concluído Teste" });
await c.from("appointments").update({ status: "confirmed" }).eq("id", id);
await c.from("appointments").update({ status: "in_progress", actual_start: new Date().toISOString() }).eq("id", id);
await c.from("appointments").update({ status: "done", actual_end: new Date().toISOString(), payment_method: "pix" }).eq("id", id);
{
  const { data: e } = await c.from("earnings").select("commission_value").eq("appointment_id", id).single();
  Number(e.commission_value) === 20 ? ok("concluído: comissão inicial R$20 (40×50%)") : no(`comissão inicial errada: ${e.commission_value}`);
}

// EDITAR o concluído: troca serviço p/ Esmaltação em gel (80) e forma p/ crédito
{
  const { error } = await c.rpc("edit_appointment", {
    p_id: id, p_professional_id: pat.id, p_service_id: gel.id, p_scheduled_start: d.toISOString(),
    p_client_name: "Concluído Teste", p_payment_method: "credit",
  });
  const { data: a } = await c.from("appointments").select("price_snapshot, payment_method").eq("id", id).single();
  const { data: e } = await c.from("earnings").select("commission_value, gross_value").eq("appointment_id", id).single();
  !error && Number(a.price_snapshot) === 80 && a.payment_method === "credit" && Number(e.commission_value) === 40
    ? ok(`editado concluído: R$80/crédito e comissão RECALCULADA p/ R$40 (80×50%)`)
    : no(`editar concluído falhou: ${error?.message ?? JSON.stringify({a, e})}`);
}

// EXCLUIR o concluído (RPC remove a comissão junto)
{
  const { error } = await c.rpc("delete_appointment", { p_id: id });
  const { data: gone } = await c.from("appointments").select("id").eq("id", id);
  const { data: eg } = await c.from("earnings").select("id").eq("appointment_id", id);
  !error && (gone?.length ?? 0) === 0 && (eg?.length ?? 0) === 0
    ? ok("concluído excluído (atendimento + comissão removidos)")
    : no(`excluir concluído falhou: ${error?.message ?? "resíduo"}`);
}

console.log(`\n${fail === 0 ? "TUDO OK" : "FALHAS"} — ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
