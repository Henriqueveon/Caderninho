import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTeam } from "@/hooks/useTeam";
import { useEarnings } from "@/hooks/useFinance";
import {
  PERIOD_LABELS,
  type Period,
  periodLabel,
  periodRange,
  seriesBucket,
  shiftPeriod,
} from "@/lib/dates";
import {
  buildSeries,
  byProfessional,
  downloadCSV,
  professionalsCSV,
  sumTotals,
} from "@/lib/finance";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

const PERIODS: Period[] = ["month", "quarter", "year", "week"];

export function FinancePage() {
  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const range = useMemo(() => periodRange(anchor, period), [anchor, period]);

  const earnings = useEarnings(range);
  const team = useTeam();

  const rows = earnings.data ?? [];
  const totals = sumTotals(rows);
  const nameMap = new Map(
    (team.data ?? []).map((m) => [
      m.professional_id,
      { name: m.full_name, color: m.color },
    ]),
  );
  const perPro = byProfessional(rows, nameMap);
  const series = buildSeries(rows, seriesBucket(period));

  const kpis = [
    { label: "Faturamento", value: formatBRL(totals.gross), tone: "text-foreground" },
    { label: "Comissões", value: formatBRL(totals.commission), tone: "text-primary" },
    { label: "Parte do estúdio", value: formatBRL(totals.studio), tone: "text-emerald-600" },
    { label: "Atendimentos", value: String(totals.count), tone: "text-foreground" },
  ];

  function exportCSV() {
    const label = periodLabel(anchor, period).replace(/[^\w]+/g, "-");
    downloadCSV(`financeiro-${label}.csv`, professionalsCSV(perPro));
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Financeiro</h1>
        <Button variant="outline" onClick={exportCSV} disabled={rows.length === 0}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl bg-muted p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                period === p
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Anterior"
            onClick={() => setAnchor((a) => shiftPeriod(a, period, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            Atual
          </Button>
          <Button variant="outline" size="icon" aria-label="Próximo"
            onClick={() => setAnchor((a) => shiftPeriod(a, period, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm font-medium capitalize text-muted-foreground">
          {periodLabel(anchor, period)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {k.label}
              </p>
              <p className={`tnums mt-1 text-2xl font-semibold ${k.tone}`}>
                {earnings.isLoading ? "—" : k.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="mb-4 text-sm font-medium">Faturamento no período</p>
          {series.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Sem faturamento neste período.
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--primary-tint)" }}
                    formatter={(v: number) => [formatBRL(v), "Faturamento"]}
                    labelStyle={{ fontSize: 12 }}
                    contentStyle={{
                      borderRadius: 12,
                      fontSize: 12,
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  />
                  <Bar dataKey="faturamento" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="p-4 font-medium">Profissional</th>
                  <th className="p-4 text-right font-medium">Atend.</th>
                  <th className="p-4 text-right font-medium">Bruto</th>
                  <th className="p-4 text-right font-medium">Comissão</th>
                  <th className="p-4 text-right font-medium">Estúdio</th>
                </tr>
              </thead>
              <tbody>
                {perPro.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum atendimento concluído no período.
                    </td>
                  </tr>
                ) : (
                  perPro.map((r) => (
                    <tr key={r.professionalId} className="border-b last:border-0">
                      <td className="p-4">
                        <span
                          className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                          style={{ backgroundColor: r.color }}
                        />
                        {r.name}
                      </td>
                      <td className="tnums p-4 text-right">{r.count}</td>
                      <td className="tnums p-4 text-right">{formatBRL(r.gross)}</td>
                      <td className="tnums p-4 text-right text-primary">
                        {formatBRL(r.commission)}
                      </td>
                      <td className="tnums p-4 text-right">{formatBRL(r.studio)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {perPro.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td className="p-4">Total</td>
                    <td className="tnums p-4 text-right">{totals.count}</td>
                    <td className="tnums p-4 text-right">{formatBRL(totals.gross)}</td>
                    <td className="tnums p-4 text-right text-primary">
                      {formatBRL(totals.commission)}
                    </td>
                    <td className="tnums p-4 text-right">{formatBRL(totals.studio)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
