import { motion } from "framer-motion";

import type { DayPoint } from "@/hooks/useInsights";

/** Semana seg–sáb: colunas finas assentadas numa linha-guia; hoje em destaque. */
export function WeekColumns({
  data,
  formatValue,
  showValues = true,
}: {
  data: DayPoint[];
  formatValue: (n: number) => string;
  showValues?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  // Leitor de tela recebe a série em texto: a barra sozinha não comunica nada.
  const summary = data.map((d) => `${d.label}: ${formatValue(d.value)}`).join(", ");
  return (
    <div>
      <div
        role="img"
        aria-label={`Movimento da semana — ${summary}`}
        className="relative flex items-end gap-2.5"
        style={{ height: 116 }}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-rule" />
        {data.map((d, i) => {
          const h = d.value > 0 ? Math.max(6, (d.value / max) * 96) : 2;
          return (
            <div
              key={d.key}
              className="relative flex flex-1 flex-col items-center justify-end"
            >
              {showValues && d.value > 0 && (
                <span className="figure mb-1.5 text-[10px] leading-none text-muted-foreground">
                  {formatValue(d.value)}
                </span>
              )}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: h }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                className="w-[56%] rounded-t-[3px]"
                style={{
                  backgroundColor: "var(--primary)",
                  opacity: d.value > 0 ? (d.isToday ? 1 : 0.32) : 0.14,
                }}
                title={`${d.label}: ${formatValue(d.value)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2.5">
        {data.map((d) => (
          <span
            key={d.key}
            className={`kicker flex-1 text-center ${d.isToday ? "text-primary" : ""}`}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
