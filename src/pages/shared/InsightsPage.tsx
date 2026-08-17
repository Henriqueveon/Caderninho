import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { BarList } from "@/components/insights/BarList";
import { ColumnChart } from "@/components/insights/ColumnChart";
import { Panel } from "@/components/insights/Panel";
import { PeriodPicker } from "@/components/insights/PeriodPicker";
import { SectionLabel } from "@/components/insights/SectionLabel";
import { StatTile } from "@/components/insights/StatTile";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfessional } from "@/hooks/useAgenda";
import { useInsights } from "@/hooks/useInsights";
import { type InsightsSelection } from "@/lib/dates";
import { formatBRL } from "@/lib/format";

const compactBRL = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}k` : n.toFixed(0);

/** Duas fichas lado a lado, divididas por linha-guia (evita bordas tortas). */
function Strip({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-rule rounded-[16px] border border-rule bg-card">
      {children}
    </div>
  );
}

export function InsightsPage() {
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner";
  const myPro = useMyProfessional();
  const [selection, setSelection] = useState<InsightsSelection>(() => ({
    unit: "week",
    anchor: new Date(),
  }));
  const ins = useInsights(isOwner ? undefined : myPro.data?.id, selection);

  const metricLabel = ins.metric === "gross" ? "faturamento" : "comissão";
  const wdMax = Math.max(...ins.byWeekday.map((d) => d.value), 0);
  const up = (ins.deltaPct ?? 0) >= 0;
  const seriesTitle =
    selection.unit === "week"
      ? isOwner
        ? "Semana do estúdio"
        : "Sua semana"
      : "Movimento do período";

  return (
    <section className="flex flex-col gap-7">
      <div>
        <p className="kicker">{isOwner ? "Painel do estúdio" : "Seu desempenho"}</p>
        <h1 className="mt-1 text-title">Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ins.periodLabel}</p>
      </div>

      <PeriodPicker value={selection} onChange={setSelection} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Strip>
          <StatTile
            label="No período"
            value={formatBRL(ins.total)}
            caption={metricLabel}
            accent="text-brand"
          />
          <StatTile label="Já garantido" value={formatBRL(ins.guaranteed)} caption="a caminho" />
        </Strip>
        <Strip>
          <StatTile label="Ticket médio" value={formatBRL(ins.ticketMedio)} caption="por atend." />
          <StatTile
            label="Comparecimento"
            value={ins.attendanceRate === null ? "—" : `${ins.attendanceRate.toFixed(0)}%`}
            caption="no período"
            accent="text-success"
          />
        </Strip>
      </div>

      {ins.deltaPct !== null && (
        <p className="-mt-3 flex items-center gap-1.5 text-sm">
          {up ? (
            <ArrowUpRight className="h-4 w-4 text-success" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          )}
          <span className={`font-medium ${up ? "text-success" : "text-destructive"}`}>
            {up ? "+" : ""}
            {ins.deltaPct.toFixed(0)}%
          </span>
          <span className="text-muted-foreground">vs. {ins.previousLabel}</span>
        </p>
      )}

      <div>
        <SectionLabel
          right={<span className="kicker">{selection.unit === "week" ? "seg–sáb" : metricLabel}</span>}
        >
          {seriesTitle}
        </SectionLabel>
        <Panel className="p-4">
          <ColumnChart data={ins.series} formatValue={compactBRL} label={seriesTitle} />
          <p className="mt-4 border-t border-rule pt-3 text-sm text-muted-foreground">
            Total do período{" "}
            <span className="figure font-semibold text-foreground">{formatBRL(ins.total)}</span>
          </p>
        </Panel>
      </div>

      <div>
        <SectionLabel right={<span className="kicker">{metricLabel}</span>}>
          Períodos anteriores
        </SectionLabel>
        <Panel className="p-4">
          <BarList
            rows={ins.trend.map((w) => ({
              key: w.key,
              label: w.label,
              value: w.value,
              highlight: w.isToday,
            }))}
            formatValue={formatBRL}
          />
        </Panel>
      </div>

      <div>
        <SectionLabel right={<span className="kicker">no período</span>}>
          Melhor dia da semana
        </SectionLabel>
        <Panel className="p-4">
          <BarList
            rows={ins.byWeekday.map((d) => ({
              key: d.key,
              label: d.label,
              value: d.value,
              highlight: d.value === wdMax && wdMax > 0,
            }))}
            formatValue={formatBRL}
          />
        </Panel>
      </div>

      <div>
        <SectionLabel right={<span className="kicker">no período</span>}>
          Serviços mais feitos
        </SectionLabel>
        <Panel className="p-4">
          <BarList
            rows={ins.topServices.map((s) => ({
              key: s.name,
              label: s.name,
              value: s.count,
              caption: formatBRL(s.revenue),
            }))}
            formatValue={(n) => `${Math.round(n)}×`}
            emptyLabel="Nenhum atendimento concluído neste período."
          />
        </Panel>
      </div>

      {isOwner && ins.team && (
        <div>
          <SectionLabel right={<span className="kicker">no período</span>}>
            Ranking da equipe
          </SectionLabel>
          <Panel className="p-4">
            <BarList
              rows={ins.team.map((t, i) => ({
                key: t.id,
                label: t.name,
                value: t.value,
                caption: `${t.count} atend.`,
                color: t.color,
                highlight: i === 0,
                leading: (
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                ),
              }))}
              formatValue={formatBRL}
              emptyLabel="Sem atendimentos neste período ainda."
            />
          </Panel>
        </div>
      )}

      <Strip>
        <StatTile
          label="Melhor dia"
          value={ins.bestDay ? formatBRL(ins.bestDay.value) : "—"}
          caption={ins.bestDay ? ins.bestDay.label : "sem dados"}
          accent="text-warning"
        />
        <StatTile
          label="Clientes atendidas"
          value={String(ins.clientsServed)}
          caption="no período"
        />
      </Strip>
    </section>
  );
}
