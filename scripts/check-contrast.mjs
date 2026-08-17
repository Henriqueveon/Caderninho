// Confere contraste WCAG dos tokens de cor, nos dois temas.
// Lê os valores direto de src/styles/tokens.css para não sair de sincronia.
// Uso: node scripts/check-contrast.mjs
import { readFileSync } from "node:fs";

const css = readFileSync("src/styles/tokens.css", "utf8");

/** Extrai os tokens de um bloco (`:root` ou o bloco do tema escuro). */
function tokens(selector) {
  const i = css.indexOf(selector);
  if (i < 0) throw new Error(`bloco ${selector} não encontrado`);
  const body = css.slice(css.indexOf("{", i) + 1, css.indexOf("}", i));
  const out = {};
  for (const [, k, v] of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    out[k] = v.trim();
  }
  return out;
}

const light = tokens(":root {");
const dark = { ...light, ...tokens(':root[data-theme="dark"]') };

const srgb = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function luminance(hex) {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  if (a == null || b == null) return null;
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// [rótulo, token do texto, token do fundo, mínimo exigido]
// 4.5 = texto normal · 3 = texto grande (18px+) e elementos de interface
const PAIRS = [
  ["texto no fundo", "text", "bg", 4.5],
  ["texto no card", "text", "card", 4.5],
  ["texto no fundo 2", "text", "bg-secondary", 4.5],
  ["texto secundário no fundo", "text-secondary", "bg", 4.5],
  ["texto secundário no card", "text-secondary", "card", 4.5],
  ["primária como TEXTO no fundo", "primary-text", "bg", 4.5],
  ["primária como TEXTO no card", "primary-text", "card", 4.5],
  ["primária como PREENCHIMENTO", "primary", "bg", 3],
  ["sucesso no card", "success", "card", 4.5],
  ["erro no card", "error", "card", 4.5],
  ["aviso no card", "warning", "card", 4.5],
  ["contorno de controle no card", "border-strong", "card", 3],
];

let fails = 0;
for (const [name, theme] of [
  ["CLARO", light],
  ["ESCURO", dark],
]) {
  console.log(`\n=== TEMA ${name} ===`);
  for (const [label, fgK, bgK, min] of PAIRS) {
    const r = ratio(theme[fgK], theme[bgK]);
    if (r == null) {
      console.log(`  ??  ${label} (token não é hex sólido)`);
      continue;
    }
    const ok = r >= min;
    if (!ok) fails++;
    console.log(
      `  ${ok ? "ok " : "FALHA"} ${label.padEnd(30)} ${r.toFixed(2)}:1 (mín ${min})`,
    );
  }
  // Texto branco sobre o botão primário (gradiente: checa a ponta mais clara,
  // que é o pior caso para texto branco).
  // Pior caso do botão: o branco sobre a ponta MAIS CLARA do gradiente.
  const lightest = theme["gradient-primary"].match(/#[0-9a-f]{6}/i)[0];
  const r = ratio("#ffffff", lightest);
  const ok = r >= 4.5;
  if (!ok) fails++;
  console.log(
    `  ${ok ? "ok " : "FALHA"} ${"branco no botão primário".padEnd(30)} ${r.toFixed(2)}:1 (mín 4.5)`,
  );
}

console.log(
  fails === 0 ? "\nTodos os pares passam." : `\n${fails} par(es) reprovando.`,
);
process.exit(fails === 0 ? 0 : 1);
