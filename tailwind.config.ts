import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "Manrope",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        // superfícies + texto (mapeadas para os design tokens)
        background: "var(--bg)",
        "bg-secondary": "var(--bg-secondary)",
        foreground: "var(--text)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--text)",
        },
        // `brand` = o rosé quando vira LETRA (escuro o bastante para ler).
        // `primary` = o rosé quando vira PREENCHIMENTO (barra, ponto, fundo).
        brand: "var(--primary-text)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "#ffffff",
          light: "var(--primary-light)",
          dark: "var(--primary-dark)",
        },
        secondary: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text)",
        },
        muted: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text-secondary)",
        },
        accent: {
          DEFAULT: "var(--primary-light)",
          foreground: "var(--text)",
        },
        destructive: {
          DEFAULT: "var(--error)",
          foreground: "#ffffff",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        border: "var(--border)",
        rule: "var(--rule)",
        input: "var(--border-strong)",
        "border-strong": "var(--border-strong)",
        ring: "var(--primary)",
      },
      // Escala tipográfica do produto. Antes cada tela escolhia text-2xl ou
      // text-3xl no olho; nomear os degraus é o que separa "usei Tailwind" de
      // "tem sistema". Cada degrau já carrega entrelinha e espaçamento —
      // título grande precisa de tracking negativo, texto pequeno de positivo.
      fontSize: {
        display: ["2.25rem", { lineHeight: "1.08", letterSpacing: "-0.025em", fontWeight: "600" }],
        title: ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.018em", fontWeight: "600" }],
        section: ["1.0625rem", { lineHeight: "1.35", letterSpacing: "-0.01em", fontWeight: "600" }],
        body: ["0.9375rem", { lineHeight: "1.55" }],
        caption: ["0.8125rem", { lineHeight: "1.45", letterSpacing: "0.005em" }],
      },
      keyframes: {
        // O brilho atravessa o bloco e sai — 1.6s é lento o bastante para não
        // virar pisca-pisca e rápido o bastante para parecer vivo.
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
      },
      borderRadius: {
        button: "var(--radius-button)",
        card: "var(--radius-card)",
        input: "var(--radius-input)",
        modal: "var(--radius-modal)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        soft: "var(--shadow-soft)",
        float: "var(--shadow-float)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
