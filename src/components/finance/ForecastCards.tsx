import { motion } from "framer-motion";

import type { Forecast } from "@/hooks/useFinance";
import { formatBRL } from "@/lib/format";

/**
 * Previsibilidade de ganhos: Realizado | Já garantido | Potencial,
 * com barra empilhada e a frase de impacto (Seção 6.4).
 */
export function ForecastCards({
  forecast,
  loading,
}: {
  forecast: Forecast | undefined;
  loading: boolean;
}) {
  const f = forecast ?? { realizado: 0, agendado: 0, potencial: 0 };
  const total = f.realizado + f.agendado + f.potencial || 1;
  const pct = (v: number) => `${(v / total) * 100}%`;

  const cards = [
    { label: "Realizado no mês", value: f.realizado, color: "text-emerald-600", bar: "#10B981" },
    { label: "Já garantido", value: f.agendado, color: "text-violet-600", bar: "#8B5CF6" },
    { label: "Potencial", value: f.potencial, color: "text-amber-600", bar: "#F59E0B" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="rounded-2xl bg-card p-5 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className={`tnums mt-1 text-2xl font-semibold ${c.color}`}>
              {loading ? "—" : formatBRL(c.value)}
            </p>
          </motion.div>
        ))}
      </div>

      {!loading && total > 1 && (
        <div>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            {cards.map((c) => (
              <div
                key={c.label}
                style={{ width: pct(c.value), backgroundColor: c.bar }}
                title={`${c.label}: ${formatBRL(c.value)}`}
              />
            ))}
          </div>
          {f.potencial > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Preenchendo os horários livres deste mês, você pode ganhar até{" "}
              <span className="font-semibold text-foreground">
                {formatBRL(f.potencial)}
              </span>{" "}
              a mais.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
