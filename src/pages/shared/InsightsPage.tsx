import { BarList } from "@/components/insights/BarList";
import { Panel } from "@/components/insights/Panel";
import { SectionLabel } from "@/components/insights/SectionLabel";
import { StatTile } from "@/components/insights/StatTile";
import { WeekColumns } from "@/components/insights/WeekColumns";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfessional } from "@/hooks/useAgenda";
import { useInsights } from "@/hooks/useInsights";
import { businessWeekLabel } from "@/lib/dates";
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
  const ins = useInsights(isOwner ? undefined : myPro.data?.id);
  const metricLabel = ins.metric === "gross" ? "faturamento" : "comissão";
  const wdMax = Math.max(...ins.byWeekday.map((d) => d.value), 0);

  return (
    <section className="flex flex-col gap-7">
      <div>
        <p className="kicker">{isOwner ? "Painel do estúdio" : "Seu desempenho"}</p>
        <h1 className="mt-1 text-3xl">Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">{businessWeekLabel(new Date())}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Strip>
          <StatTile label="Esta semana" value={formatBRL(ins.weekTotal)} caption={metricLabel} accent="text-primary" />
          <StatTile label="Já garantido" value={formatBRL(ins.weekGuaranteed)} caption="a caminho" />
        </Strip>
        <Strip>
          <StatTile label="Ticket médio" value={formatBRL(ins.ticketMedio)} caption="por atend." />
          <StatTile
            label="Comparecimento"
            value={ins.attendanceRate === null ? "—" : `${ins.attendanceRate.toFixed(0)}%`}
            caption="60 dias"
            accent="text-success"
          />
        </Strip>
      </div>

      <div>
        <SectionLabel right={<span className="kicker">seg–sáb</span>}>
          {isOwner ? "Semana do estúdio" : "Sua semana"}
        </SectionLabel>
        <Panel className="p-4">
          <WeekColumns data={ins.weekDays} formatValue={compactBRL} />
          <p className="mt-4 border-t border-rule pt-3 text-sm text-muted-foreground">
            Total da semana{" "}
            <span className="figure font-semibold text-foreground">{formatBRL(ins.weekTotal)}</span>
          </p>
        </Panel>
      </div>

      <div>
        <SectionLabel right={<span className="kicker">{metricLabel}</span>}>
          Últimas 8 semanas
        </SectionLabel>
        <Panel className="p-4">
          <BarList
            rows={ins.weeklyTrend.map((w) => ({
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
        <SectionLabel right={<span className="kicker">60 dias</span>}>
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
        <SectionLabel right={<span className="kicker">60 dias</span>}>
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
            emptyLabel="Nenhum atendimento concluído ainda."
          />
        </Panel>
      </div>

      {isOwner && ins.team && (
        <div>
          <SectionLabel right={<span className="kicker">nesta semana</span>}>
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
              emptyLabel="Sem atendimentos nesta semana ainda."
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
          caption="60 dias"
        />
      </Strip>
    </section>
  );
}
