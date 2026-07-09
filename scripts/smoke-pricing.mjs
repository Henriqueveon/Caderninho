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
const vic = pros.find((p) => p.full_name === "Victoria Batista");
const pat = pros.find((p) => p.full_name === "Patrícia");
const { data: services } = await c.from("services").select("*").eq("active", true);
const gel = services.find((s) => s.name === "Esmaltação em gel");

// próxima segunda para não colidir com disponibilidade/agenda real
const base = new Date(); base.setHours(11, 0, 0, 0);
while (base.getDay() !== 1) base.setDate(base.getDate() + 1);

async function bookAndCheck(prof, when, expectPrice, expectDurMin, label) {
  const { data: id, error } = await c.rpc("book_appointment", {
    p_professional_id: prof.id, p_service_id: gel.id,
    p_scheduled_start: when.toISOString(), p_client_name: "Preço " + label,
  });
  if (error) { no(`${label}: ${error.message}`); return; }
  const { data: a } = await c.from("appointments").select("price_snapshot, scheduled_start, scheduled_end").eq("id", id).single();
  const dur = (new Date(a.scheduled_end) - new Date(a.scheduled_start)) / 60000;
  Number(a.price_snapshot) === expectPrice && dur === expectDurMin
    ? ok(`${label}: R$${a.price_snapshot} / ${dur}min (esperado R$${expectPrice}/${expectDurMin}min)`)
    : no(`${label}: R$${a.price_snapshot}/${dur}min ≠ R$${expectPrice}/${expectDurMin}min`);
  await c.from("appointments").delete().eq("id", id);
}

// mesmo serviço, profissionais diferentes → preço/duração diferentes
const t1 = new Date(base);
const t2 = new Date(base); t2.setHours(14, 0, 0, 0);
await bookAndCheck(vic, t1, 90, 60, "Victoria (esmaltação gel)");
await bookAndCheck(pat, t2, 80, 90, "Patrícia (esmaltação gel)");

console.log(`\n${fail === 0 ? "TUDO OK" : "FALHAS"} — ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
