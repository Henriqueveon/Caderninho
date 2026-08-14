// Igual ao shoot.mjs, mas captura a página inteira (fullPage) — útil para
// revisar telas longas como Insights. Uso: node scripts/shoot-full.mjs nome email "/rota" [dark] [larguraxaltura]
import { chromium } from "playwright-core";

const OUT = process.argv[2] || "shot";
const EMAIL = process.argv[3] || "victoriabatista@esmalteria.vb";
const PATHS = (process.argv[4] || "/admin/dashboard").split(",");
const DARK = process.argv[5] === "dark";
const [w, h] = (process.argv[6] || "1280x900").split("x").map(Number);

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: w, height: h } });
const page = await ctx.newPage();

await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
if (DARK) {
  await page.evaluate(() => localStorage.setItem("caderninho-theme", "dark"));
}
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', "102030");
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

let i = 0;
for (const p of PATHS) {
  await page.goto(`http://localhost:5173${p}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  const name = PATHS.length > 1 ? `${OUT}-${i}` : OUT;
  await page.screenshot({ path: `${process.env.SHOTDIR}/${name}.png`, fullPage: true });
  console.log("shot", p, "->", name);
  i++;
}
await browser.close();
