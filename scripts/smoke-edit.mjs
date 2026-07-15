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
const { data: pros } = await owner.rpc("get_bookable_professionals");
const pat = pros.find((p) => p.full_name === "Patrícia");
const kim = pros.find((p) => p.full_name === "Kimberly");
const { data: svcs } = await owner.from("services").select("id, name, active").eq("active", true);
const gel = svcs.find((s) => s.name === "Esmaltação em gel");
const mani = svcs.find((s) => s.name === "Manicure");

// próxima segunda 11h
const d = new Date(); d.setHours(11, 0, 0, 0);
while (d.getDay() !== 1) d.setDate(d.getDate() + 1);

// 1. cria um atendimento (errado) para a Patrícia
const { data: apptId, error: bErr } = await owner.rpc("book_appointment", {
  p_professional_id: pat.id, p_service_id: mani.id, p_scheduled_start: d.toISOString(), p_client_name: "Editar Teste",
});
bErr ? no(`criar: ${bErr.message}`) : ok("atendimento criado (Patrícia / Manicure)");

// 2. EDITAR: troca profissional (Kimberly), serviço (gel) e horário → recalcula snapshot
{
  const d2 = new Date(d); d2.setHours(14, 0, 0, 0);
  const { error } = await owner.rpc("edit_appointment", {
    p_id: apptId, p_professional_id: kim.id, p_service_id: gel.id, p_scheduled_start: d2.toISOString(), p_client_name: "Editar Teste",
  });
  const { data: a } = await owner.from("appointments").select("professional_id, service_id, price_snapshot, scheduled_start, scheduled_end").eq("id", apptId).single();
  const dur = (new Date(a.scheduled_end) - new Date(a.scheduled_start)) / 60000;
  !error && a.professional_id === kim.id && a.service_id === gel.id && Number(a.price_snapshot) === 80 && dur === 90
    ? ok(`editado: agora Kimberly/gel R$${a.price_snapshot}/${dur}min (snapshot recalculado)`)
    : no(`edição falhou: ${error?.message ?? JSON.stringify(a)}`);
}

// 3. FINALIZAR com forma de pagamento
{
  await owner.from("appointments").update({ status: "confirmed" }).eq("id", apptId);
  await owner.from("appointments").update({ status: "in_progress", actual_start: new Date().toISOString() }).eq("id", apptId);
  const { error } = await owner.from("appointments").update({ status: "done", actual_end: new Date().toISOString(), payment_method: "debit" }).eq("id", apptId);
  const { data: a } = await owner.from("appointments").select("status, payment_method").eq("id", apptId).single();
  !error && a.status === "done" && a.payment_method === "debit"
    ? ok("finalizado com forma de pagamento = débito")
    : no(`finalizar/forma pgto falhou: ${JSON.stringify(a)}`);
}

// 4. editar concluído deve ser BLOQUEADO
{
  const { error } = await owner.rpc("edit_appointment", {
    p_id: apptId, p_professional_id: kim.id, p_service_id: mani.id, p_scheduled_start: d.toISOString(),
  });
  error && /finalizad/i.test(error.message) ? ok("editar concluído bloqueado") : no(`deveria bloquear (${error?.message ?? "sem erro"})`);
}

// 5. excluir concluído deve FALHAR (tem comissão) — limpamos via earning depois
{
  const { error } = await owner.from("appointments").delete().eq("id", apptId);
  error ? ok("excluir concluído bloqueado pela FK da comissão") : no("excluiu um concluído (não deveria)");
  // cleanup: reverte para não-done (apaga earning via trigger) e exclui
  await owner.from("appointments").update({ status: "canceled" }).eq("id", apptId);
  await owner.from("appointments").delete().eq("id", apptId);
  const { data: gone } = await owner.from("appointments").select("id").eq("id", apptId);
  (gone?.length ?? 0) === 0 ? ok("atendimento não-concluído excluído (cleanup)") : no("cleanup falhou");
}

// 6. PROFISSIONAL cadastra nova cliente
{
  const patC = await login("patricia@esmalteria.vb");
  const studioId = (await patC.from("profiles").select("studio_id").eq("id", (await patC.auth.getUser()).data.user.id).single()).data.studio_id;
  const { data, error } = await patC.from("clients").insert({ studio_id: studioId, full_name: "Cliente da Pati" }).select("id").single();
  error ? no(`profissional cadastrar cliente: ${error.message}`) : ok("profissional cadastrou nova cliente");
  if (data) await owner.from("clients").delete().eq("id", data.id);
}

console.log(`\n${fail === 0 ? "TUDO OK" : "FALHAS"} — ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
