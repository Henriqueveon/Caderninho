import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  INSIGHTS_UNIT_LABELS,
  type InsightsSelection,
  type InsightsUnit,
  insightsLabel,
  insightsRange,
  shiftInsights,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

const UNITS: InsightsUnit[] = ["week", "month", "quarter", "year", "custom"];
const inputDate = (d: Date) => format(d, "yyyy-MM-dd");
/** Lê "yyyy-MM-dd" como data local — `new Date(str)` interpretaria em UTC e
 *  puxaria o dia para trás no nosso fuso. */
const parseDate = (v: string) => {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Escolha do recorte das métricas. O padrão é a semana útil (seg–sáb); as
 * setas andam de período em período e "Escolher" abre o intervalo livre.
 */
export function PeriodPicker({
  value,
  onChange,
}: {
  value: InsightsSelection;
  onChange: (next: InsightsSelection) => void;
}) {
  const range = insightsRange(value);
  const lastDay = new Date(+range.end - 86400000);

  const pickUnit = (unit: InsightsUnit) => {
    if (unit === "custom") {
      // Entra no modo livre já preenchido com o intervalo atual, para o usuário
      // só ajustar as pontas em vez de começar do zero.
      onChange({ unit, anchor: value.anchor, start: range.start, end: lastDay });
    } else {
      onChange({ unit, anchor: value.anchor });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* No celular as setas descem para a linha de baixo: espremer as duas
          coisas numa linha só cortava "Escolher". */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div
          role="group"
          aria-label="Período das métricas"
          className="flex flex-1 gap-1 overflow-x-auto rounded-xl bg-muted p-1 sm:flex-none [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {UNITS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => pickUnit(u)}
              aria-pressed={value.unit === u}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                value.unit === u
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {INSIGHTS_UNIT_LABELS[u]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 self-end sm:self-auto">
          <Button
            variant="outline"
            size="icon"
            aria-label="Período anterior"
            onClick={() => onChange(shiftInsights(value, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próximo período"
            onClick={() => onChange(shiftInsights(value, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {value.unit === "custom" && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-rule p-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            De
            <input
              type="date"
              value={inputDate(range.start)}
              max={inputDate(lastDay)}
              onChange={(e) =>
                e.target.value &&
                onChange({ ...value, start: parseDate(e.target.value), end: lastDay })
              }
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Até
            <input
              type="date"
              value={inputDate(lastDay)}
              min={inputDate(range.start)}
              onChange={(e) =>
                e.target.value &&
                onChange({ ...value, start: range.start, end: parseDate(e.target.value) })
              }
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground"
            />
          </label>
          <p className="pb-1.5 text-sm text-muted-foreground">{insightsLabel(value)}</p>
        </div>
      )}
    </div>
  );
}
