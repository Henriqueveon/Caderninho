// Confirma que a query de agenda com embed do serviço resolve em runtime.
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
const { data: services } = await c.from("services").select("*").limit(1);
const ana = pros[0];

// agenda para amanhã 11:00 na próxima terça
const d = new Date(); d.setHours(11, 0, 0, 0);
while (d.getDay() !== 3) d.setDate(d.getDate() + 1);
const { data: id, error: bookErr } = await c.rpc("book_appointment", {
  p_professional_id: ana.id, p_service_id: services[0].id,
  p_scheduled_start: d.toISOString(), p_client_name: "Embed Teste",
});
if (bookErr) { console.log("book erro:", bookErr.message); process.exit(1); }

const from = new Date(d); from.setHours(0,0,0,0);
const to = new Date(from); to.setDate(to.getDate() + 1);
const { data, error } = await c
  .from("appointments")
  .select("*, service:service_id(name, duration_minutes)")
  .gte("scheduled_start", from.toISOString())
  .lt("scheduled_start", to.toISOString())
  .order("scheduled_start");

if (error) { console.log("EMBED FALHOU:", error.message); }
else {
  const row = data.find((r) => r.id === id);
  console.log(row?.service?.name
    ? `EMBED OK — ${row.client_name_snapshot} / ${row.service.name} (${row.service.duration_minutes}min)`
    : `EMBED sem service: ${JSON.stringify(row?.service)}`);
}
await c.from("appointments").delete().eq("id", id);
process.exit(error ? 1 : 0);
