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
        input: "var(--border)",
        ring: "var(--primary)",
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
