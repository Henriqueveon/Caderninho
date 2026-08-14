import { motion } from "framer-motion";

import type { DayPoint } from "@/hooks/useInsights";

/**
 * Colunas finas assentadas numa linha-guia; o bucket atual em destaque.
 * Serve tanto para os 6 dias da semana quanto para os 31 de um mês ou os 12
 * meses de um ano — os rótulos e os valores somem conforme aperta o espaço.
 */
export function ColumnChart({
  data,
  formatValue,
  label = "Movimento do período",
}: {
  data: DayPoint[];
  formatValue: (n: number) => string;
  label?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const dense = data.length > 8;
  // Com muitas colunas, só um rótulo a cada N para não virar borrão.
  const labelEvery = data.length <= 12 ? 1 : Math.ceil(data.length / 8);
  // Leitor de tela recebe a série em texto: a barra sozinha não comunica nada.
  const summary = data.map((d) => `${d.label}: ${formatValue(d.value)}`).join(", ");

  return (
    <div>
      <div
        role="img"
        aria-label={`${label} — ${summary}`}
        className={dense ? "relative flex items-end gap-1" : "relative flex items-end gap-2.5"}
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
              {!dense && d.value > 0 && (
                <span className="figure mb-1.5 text-[10px] leading-none text-muted-foreground">
                  {formatValue(d.value)}
                </span>
              )}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: h }}
                transition={{
                  delay: Math.min(i * 0.05, 0.5),
                  duration: 0.4,
                  ease: "easeOut",
                }}
                className={dense ? "w-[72%] rounded-t-[2px]" : "w-[56%] rounded-t-[3px]"}
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
      <div className={dense ? "mt-2 flex gap-1" : "mt-2 flex gap-2.5"} aria-hidden>
        {data.map((d, i) => (
          <span
            key={d.key}
            className={`kicker flex-1 truncate text-center ${d.isToday ? "text-primary" : ""}`}
          >
            {i % labelEvery === 0 || d.isToday ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
