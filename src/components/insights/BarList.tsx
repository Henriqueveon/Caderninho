import { motion } from "framer-motion";

export interface BarRow {
  key: string;
  label: string;
  value: number;
  caption?: string;
  color?: string;
  highlight?: boolean;
  leading?: React.ReactNode;
}

/** Linhas de razão: rótulo à esquerda, valor serifado à direita, e um traço
 *  fino (2px) sublinhando cada linha na proporção do valor. */
export function BarList({
  rows,
  formatValue,
  emptyLabel = "Sem dados ainda.",
}: {
  rows: BarRow[];
  formatValue: (n: number) => string;
  emptyLabel?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (rows.length === 0 || rows.every((r) => r.value === 0)) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5 text-sm">
              {r.leading}
              <span className={`truncate ${r.highlight ? "font-medium" : ""}`}>
                {r.label}
              </span>
            </span>
            <span className="figure shrink-0 text-sm">
              {formatValue(r.value)}
              {r.caption && (
                <span className="ml-1.5 font-sans text-xs text-muted-foreground">
                  {r.caption}
                </span>
              )}
            </span>
          </div>
          <div className="relative mt-1.5 h-px w-full bg-rule">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ delay: i * 0.04, duration: 0.5, ease: "easeOut" }}
              className="absolute -top-px left-0 h-[2px] rounded-full"
              style={{
                backgroundColor: r.color ?? "var(--primary)",
                opacity: r.highlight ? 1 : 0.5,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
