// Verifica a hierarquia de acesso e o RPC de agendamento contra o Supabase real.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_ANON_KEY;
const client = () => createClient(url, key);
const login = async (email) => {
  const c = client();
  const { error } = await c.auth.signInWithPassword({ email, password: "102030" });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
};

let pass = 0, fail = 0;
const ok = (m) => (pass++, console.log("  ✓", m));
const no = (m) => (fail++, console.log("  ✗", m));

// contexto: gestora agenda
const owner = await login("victoriabatista@esmalteria.vb");
const { data: pros } = await owner.rpc("get_bookable_professionals");
const ana = pros.find((p) => p.full_name === "Ana Souza");
const bruna = pros.find((p) => p.full_name === "Bruna Lima");
const { data: services } = await owner.from("services").select("*").order("price");
const gel = services.find((s) => s.name === "Esmaltação em gel"); // R$60, 60min

// próxima terça 10:00 (dia com disponibilidade)
const d = new Date(); d.setHours(10, 0, 0, 0);
while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
if (d < new Date()) d.setDate(d.getDate() + 7);
const start = d.toISOString();

// 1. gestora agenda para Ana
let apptId;
{
  const { data, error } = await owner.rpc("book_appointment", {
    p_professional_id: ana.id, p_service_id: gel.id,
    p_scheduled_start: start, p_client_name: "Cliente Teste",
  });
  if (error) no(`booking gestora: ${error.message}`);
  else { apptId = data; ok(`gestora agendou (appt ${data.slice(0, 8)})`); }
}

// 2. snapshot correto: preço 60, comissão 50% (base da Ana, sem override)
{
  const { data } = await owner.from("appointments").select("*").eq("id", apptId).single();
  data.price_snapshot == 60 && data.commission_pct_snapshot == 50 && data.status === "confirmed"
    ? ok(`snapshot congelado: R$${data.price_snapshot} @ ${data.commission_pct_snapshot}% (${data.status})`)
    : no(`snapshot inesperado: R$${data?.price_snapshot} @ ${data?.commission_pct_snapshot}% ${data?.status}`);
}

// 3. conflito: mesma profissional, mesmo horário → rejeita
{
  const { error } = await owner.rpc("book_appointment", {
    p_professional_id: ana.id, p_service_id: gel.id, p_scheduled_start: start,
  });
  error ? ok(`conflito rejeitado: "${error.message}"`) : no("conflito NÃO foi rejeitado");
}

// 4. Ana (professional) vê o próprio atendimento
const anaC = await login("ana@esmalteria.vb");
{
  const { data } = await anaC.from("appointments").select("id").eq("id", apptId);
  data?.length === 1 ? ok("Ana vê o próprio atendimento") : no("Ana NÃO vê o próprio atendimento");
}

// 5. Bruna NÃO vê o atendimento da Ana (isolamento RLS)
const brunaC = await login("bruna@esmalteria.vb");
{
  const { data } = await brunaC.from("appointments").select("id").eq("id", apptId);
  data?.length === 0 ? ok("Bruna NÃO vê agenda da Ana (isolado)") : no("VAZAMENTO: Bruna vê agenda da Ana");
}

// 6. Secretária vê TODAS as agendas mas NÃO o faturamento
const secC = await login("secretaria@esmalteria.vb");
{
  const { data } = await secC.from("appointments").select("id").eq("id", apptId);
  data?.length === 1 ? ok("Secretária vê a agenda da Ana") : no("Secretária NÃO vê a agenda");
}
{
  const { data, error } = await secC.from("earnings").select("id");
  // RLS sem policy para secretary → retorna vazio (sem erro), nunca dados
  (data?.length ?? 0) === 0 ? ok("Secretária bloqueada de earnings (faturamento)") : no("VAZAMENTO: secretária vê earnings");
}

// 7. Ana finaliza → gera earning; Ana vê o próprio, Bruna não
{
  await anaC.from("appointments").update({
    status: "done", actual_start: start, actual_end: new Date().toISOString(),
  }).eq("id", apptId);
  const { data: e } = await anaC.from("earnings").select("commission_value").eq("appointment_id", apptId);
  e?.[0]?.commission_value == 30
    ? ok(`finalizar gerou earning correto (R$${e[0].commission_value} = 60×50%)`)
    : no(`earning incorreto: ${JSON.stringify(e)}`);
  const { data: eb } = await brunaC.from("earnings").select("id").eq("appointment_id", apptId);
  (eb?.length ?? 0) === 0 ? ok("Bruna NÃO vê earning da Ana") : no("VAZAMENTO: Bruna vê earning da Ana");
}

// limpeza: remove o atendimento de teste (owner pode deletar)
await owner.from("appointments").delete().eq("id", apptId);

console.log(`\n${fail === 0 ? "TUDO OK" : "FALHAS"} — ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
