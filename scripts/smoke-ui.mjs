// Varre todas as telas de todas as roles procurando erro de JS, requisição
// falhada e conteúdo que não renderizou. Uso: node scripts/smoke-ui.mjs [url]
import { chromium } from "playwright-core";

const BASE = process.argv[2] || "http://localhost:5173";
// `--mobile` repete a varredura na largura de celular, onde a barra inferior,
// as grades e as tabelas quebram de um jeito que o desktop não mostra.
const MOBILE = process.argv.includes("--mobile");
const VIEW = MOBILE ? { width: 390, height: 844 } : { width: 1280, height: 900 };
const ROTAS = {
  "victoriabatista@esmalteria.vb": [
    "/admin/dashboard","/admin/insights","/admin/agenda","/admin/atendimentos",
    "/admin/clientes","/admin/financeiro","/admin/profissionais","/admin/servicos",
    "/admin/historico","/admin/configuracoes","/admin/metas",
  ],
  "kimberly@esmalteria.vb": [
    "/pro/dashboard","/pro/insights","/pro/agenda","/pro/disponibilidade",
    "/pro/clientes","/pro/servicos","/pro/financeiro","/pro/historico","/pro/ganhos",
  ],
  "secretaria@esmalteria.vb": [
    "/secretaria/agenda","/secretaria/atendimentos","/secretaria/clientes",
    "/secretaria/disponibilidade","/secretaria/servicos",
  ],
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
let problemas = 0, telas = 0;

// Rotas públicas primeiro (sem sessão)
{
  const ctx = await browser.newContext({ viewport: VIEW });
  const page = await ctx.newPage();
  for (const rota of ["/login", "/signup", "/esqueci-senha"]) {
    const erros = [];
    page.on("pageerror", (e) => erros.push(String(e.message)));
    page.on("response", (r) => {
      if (r.status() >= 400 && !r.url().includes("/auth/v1/")) {
        erros.push(`HTTP ${r.status()} ${r.url().slice(0, 80)}`);
      }
    });
    await page.goto(BASE + rota, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    telas++;
    const texto = (await page.locator("body").innerText()).trim();
    if (texto.length < 20) erros.push("tela praticamente vazia");
    if (erros.length) { problemas += erros.length; console.log(`FALHA ${rota}\n   ${erros.join("\n   ")}`); }
    else console.log(`  ok  ${rota}`);
    page.removeAllListeners();
  }
  await ctx.close();
}

for (const [email, rotas] of Object.entries(ROTAS)) {
  const ctx = await browser.newContext({ viewport: VIEW });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "102030");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log(`\n== ${email}`);

  for (const rota of rotas) {
    const erros = [];
    const onErr = (e) => erros.push(String(e.message));
    const onResp = (r) => {
      if (r.status() >= 400 && !r.url().includes("/auth/v1/")) {
        erros.push(`HTTP ${r.status()} ${r.url().slice(0, 80)}`);
      }
    };
    page.on("pageerror", onErr);
    page.on("response", onResp);
    await page.goto(BASE + rota, { waitUntil: "networkidle" });
    await page.waitForTimeout(1300);
    telas++;

    // a tela renderizou algo de verdade?
    const texto = (await page.locator("main").innerText().catch(() => "")).trim();
    if (texto.length < 15) erros.push("conteúdo vazio");
    // sobrou algum esqueleto preso depois do carregamento?
    const presos = await page.locator('[aria-busy="true"]').count();
    if (presos > 0) erros.push(`${presos} bloco(s) de carregamento presos`);
    // rolagem horizontal indevida
    const estoura = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    if (estoura) erros.push("página rola na horizontal");

    if (erros.length) { problemas += erros.length; console.log(`FALHA ${rota}\n   ${erros.join("\n   ")}`); }
    else console.log(`  ok  ${rota}`);
    page.off("pageerror", onErr);
    page.off("response", onResp);
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${telas} telas varridas — ${problemas === 0 ? "nenhum problema" : problemas + " problema(s)"}`);
process.exit(problemas === 0 ? 0 : 1);
