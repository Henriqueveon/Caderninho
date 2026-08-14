import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { formatBRL } from "@/lib/format";
import { AnimatedNumber } from "./AnimatedNumber";
import { Seal } from "./Seal";

function greeting(name?: string) {
  const h = new Date().getHours();
  const g = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return name ? `${g}, ${name}` : g;
}

/**
 * Herói do Início no estilo "razão de atelier": data em versalete, saudação em
 * saudação discreta e o ganho da SEMANA em número grande — sem gradiente.
 */
export function HomeHero({
  name,
  isOwner,
  total,
  deltaPct,
  guaranteed,
  monthTotal,
  streak,
  periodLabel,
  loading,
}: {
  name?: string;
  isOwner: boolean;
  total: number;
  deltaPct: number | null;
  guaranteed: number;
  monthTotal: number;
  streak: number;
  periodLabel: string;
  loading: boolean;
}) {
  const up = (deltaPct ?? 0) >= 0;
  const dateKicker = format(new Date(), "EEEE · d 'de' MMMM", { locale: ptBR });

  return (
    <div className="relative">
      {streak >= 2 && (
        <div className="absolute -top-1 right-0">
          <Seal value={streak} label="dias" />
        </div>
      )}

      <p className="kicker">{dateKicker}</p>
      <p className="mt-2 text-lg text-muted-foreground">
        {greeting(name)}
      </p>

      <p className="kicker mt-5">
        {isOwner ? "Faturamento desta semana" : "Você ganhou esta semana"}
      </p>
      <p className="figure mt-1 text-[2.9rem] font-semibold leading-[1.05] tracking-[-0.02em]">
        {loading ? "—" : <AnimatedNumber value={total} format={formatBRL} />}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {deltaPct !== null && (
          <span className="inline-flex items-center gap-1">
            {up ? (
              <ArrowUpRight className="h-4 w-4 text-success" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            )}
            <span className={`font-medium ${up ? "text-success" : "text-destructive"}`}>
              {up ? "+" : ""}
              {deltaPct.toFixed(0)}%
            </span>
            <span className="text-muted-foreground">vs. semana passada</span>
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-rule pt-3 text-sm text-muted-foreground">
        {guaranteed > 0 && (
          <span>
            Já garantido{" "}
            <span className="figure font-medium text-foreground">
              {formatBRL(guaranteed)}
            </span>
          </span>
        )}
        <span>
          No mês{" "}
          <span className="figure font-medium text-foreground">
            {formatBRL(monthTotal)}
          </span>
        </span>
        <span className="ml-auto">{periodLabel}</span>
      </div>
    </div>
  );
}
