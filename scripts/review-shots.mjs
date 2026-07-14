// Capturas com interação para a revisão de UX (login + cliques + screenshot).
import { chromium } from "playwright-core";

const DIR = process.env.SHOTDIR;
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const shot = (n) => page.screenshot({ path: `${DIR}/${n}.png` });

async function login(email) {
  await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "102030");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
}

await login("victoriabatista@esmalteria.vb");

// Agenda semana / mês
await page.goto("http://localhost:5173/admin/agenda", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.getByRole("button", { name: "Semana", exact: true }).click();
await page.waitForTimeout(1000);
await shot("rev-agenda-semana");
await page.getByRole("button", { name: "Mês", exact: true }).click();
await page.waitForTimeout(1000);
await shot("rev-agenda-mes");

// Drawer novo atendimento
await page.getByRole("button", { name: /Novo atendimento/ }).click();
await page.waitForTimeout(800);
await shot("rev-novo-atendimento");
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// Drawer editar profissional (preço por serviço)
await page.goto("http://localhost:5173/admin/profissionais", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.getByRole("button", { name: "Editar" }).first().click();
await page.waitForTimeout(800);
await shot("rev-editar-prof");
await page.keyboard.press("Escape");

// Financeiro trimestre (gráfico por mês)
await page.goto("http://localhost:5173/admin/financeiro", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.getByRole("button", { name: "Trimestre", exact: true }).click();
await page.waitForTimeout(1000);
await shot("rev-financeiro-trimestre");

// Detalhe de cliente
await page.goto("http://localhost:5173/admin/clientes", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.locator("button:has-text('Mariana Alves')").first().click();
await page.waitForTimeout(800);
await shot("rev-cliente-detalhe");

console.log("done");
await browser.close();
