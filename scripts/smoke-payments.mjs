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
const ownerId = (await owner.auth.getUser()).data.user.id;
const { data: pros } = await owner.rpc("get_bookable_professionals");
const pat = pros.find((p) => p.full_name === "Patrícia");
const kim = pros.find((p) => p.full_name === "Kimberly");
const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

// limpa lançamentos anteriores de teste p/ não acumular em reexecuções
await owner.from("payments").delete().eq("studio_id", studioId);

// 1. gestora registra pagamentos e um vale (ficam como demo)
{
  const { error } = await owner.from("payments").insert([
    { studio_id: studioId, professional_id: pat.id, kind: "payment", method: "pix", amount: 300, paid_at: daysAgo(7), notes: "Pagamento da semana", created_by: ownerId },
    { studio_id: studioId, professional_id: pat.id, kind: "advance", method: "cash", amount: 80, paid_at: daysAgo(3), notes: "Vale", created_by: ownerId },
    { studio_id: studioId, professional_id: kim.id, kind: "payment", method: "pix", amount: 250, paid_at: daysAgo(1), notes: "Pagamento da semana", created_by: ownerId },
  ]);
  error ? no(`inserir pagamentos: ${error.message}`) : ok("gestora registrou 3 lançamentos (2 pagamentos + 1 vale)");
}

// 2. leitura + soma pela gestora
{
  const { data } = await owner.from("payments").select("amount, kind").eq("studio_id", studioId);
  const total = data.reduce((s, p) => s + Number(p.amount), 0);
  data.length === 3 && total === 630
    ? ok(`gestora vê os 3 lançamentos (total pago R$${total})`)
    : no(`esperava 3/R$630, veio ${data.length}/R$${total}`);
}

// 3. profissional vê só os próprios recebimentos
{
  const patC = await login("patricia@esmalteria.vb");
  const { data } = await patC.from("payments").select("professional_id, amount");
  const onlyHers = data.every((p) => p.professional_id === pat.id);
  onlyHers && data.length === 2
    ? ok(`Patrícia vê só os 2 recebimentos dela (R$${data.reduce((s,p)=>s+Number(p.amount),0)})`)
    : no(`isolamento falhou: ${data.length} linhas, onlyHers=${onlyHers}`);
}

// 4. secretária NÃO vê pagamentos
{
  const sec = await login("secretaria@esmalteria.vb");
  const { data } = await sec.from("payments").select("id");
  (data?.length ?? 0) === 0 ? ok("secretária bloqueada de pagamentos") : no("VAZAMENTO: secretária vê pagamentos");

  // 5. fix 0011: secretária agora lê serviços inativos (nome no histórico)
  const { data: inactive } = await sec.from("services").select("id").eq("active", false);
  (inactive?.length ?? 0) > 0
    ? ok(`secretária agora lê ${inactive.length} serviços inativos (fix 0011)`)
    : no("secretária ainda não lê serviços inativos");
}

console.log(`\n${fail === 0 ? "TUDO OK" : "FALHAS"} — ${pass} passaram, ${fail} falharam`);
console.log("(3 lançamentos de exemplo mantidos no banco para a demo)");
process.exit(fail === 0 ? 0 : 1);
