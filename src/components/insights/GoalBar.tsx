import { motion } from "framer-motion";

import { formatBRL } from "@/lib/format";

/** Meta do mês em traço fino (razão), com nota de incentivo. */
export function GoalBar({
  pct,
  current,
  target,
  type,
}: {
  pct: number;
  current: number;
  target: number;
  type: "revenue" | "appointments";
}) {
  const fmt = (n: number) =>
    type === "revenue" ? formatBRL(n) : `${Math.round(n)} atend.`;
  const done = pct >= 100;
  const missing = Math.max(0, target - current);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="kicker">Meta do mês</span>
        <span className="figure text-sm font-semibold text-brand">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="relative mt-2.5 h-px w-full bg-rule">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="absolute -top-px left-0 h-[2px] rounded-full bg-primary"
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {done ? (
          <span className="font-medium text-success">Meta alcançada. Parabéns.</span>
        ) : (
          <>
            {fmt(current)} de {fmt(target)} · faltam{" "}
            <span className="figure font-medium text-foreground">{fmt(missing)}</span>
          </>
        )}
      </p>
    </div>
  );
}
