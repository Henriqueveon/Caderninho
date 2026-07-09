import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
await c.auth.signInWithPassword({ email: "victoriabatista@esmalteria.vb", password: "102030" });

const { data: pros } = await c.rpc("get_bookable_professionals");
console.log("Agendáveis:", pros.map((p) => p.full_name).join(", "));
const vic = pros.find((p) => p.full_name === "Victoria Batista");
const { data: services } = await c.from("services").select("*").limit(1);

// gestora agenda para SI mesma (próxima quinta 14:00)
const d = new Date(); d.setHours(14, 0, 0, 0);
while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
const { data: id, error } = await c.rpc("book_appointment", {
  p_professional_id: vic.id, p_service_id: services[0].id,
  p_scheduled_start: d.toISOString(), p_client_name: "Cliente da Victória",
});
console.log(error ? `FALHOU: ${error.message}` : `OK: Victória agendou para si (appt ${id.slice(0,8)})`);
if (id) await c.from("appointments").delete().eq("id", id);
process.exit(error ? 1 : 0);
