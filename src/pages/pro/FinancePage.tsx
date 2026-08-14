import { useMemo, useState } from "react";

import { ForecastCards } from "@/components/finance/ForecastCards";
import { PeriodPicker } from "@/components/insights/PeriodPicker";
import { Card, CardContent } from "@/components/ui/card";
import { useMyProfessional } from "@/hooks/useAgenda";
import { useMyBalance } from "@/hooks/useBalance";
import { useEarnings, useForecast } from "@/hooks/useFinance";
import { KIND_LABEL, METHOD_LABEL, usePayments } from "@/hooks/usePayments";
import { type InsightsSelection, insightsLabel, insightsRange } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const dayLabel = (isoDate: string) =>
  format(new Date(`${isoDate}T00:00:00`), "d 'de' MMMM", { locale: ptBR });

function Tile({
  label,
  value,
  caption,
  accent = "text-foreground",
}: {
  label: string;
  value: string;
  caption?: string;
  accent?: string;
}) {
  return (
    <div className="px-3 py-3.5 text-center">
      <p className="kicker">{label}</p>
      <p className={`figure mt-1.5 whitespace-nowrap text-2xl font-semibold ${accent}`}>
        {value}
      </p>
      {caption && <p className="mt-0.5 text-[11px] text-muted-foreground">{caption}</p>}
    </div>
  );
}

/**
 * Financeiro da profissional: o que ela ganhou, o que já recebeu e quando, e
 * quanto ainda falta receber. O saldo é ACUMULADO de propósito — não muda com
 * o filtro de período, senão não responderia "quanto ainda tenho a receber".
 */
export function ProFinancePage() {
  const myPro = useMyProfessional();
  const proId = myPro.data?.id;
  const [view, setView] = useState<"ganhos" | "recebimentos">("ganhos");
  const [selection, setSelection] = useState<InsightsSelection>(() => ({
    unit: "month",
    anchor: new Date(),
  }));

  const range = useMemo(() => insightsRange(selection), [selection]);
  const forecast = useForecast(proId);
  const earnings = useEarnings(range, proId);
  const payments = usePayments(range, proId);
  const balance = useMyBalance(proId);

  const rows = earnings.data ?? [];
  const paidRows = payments.isError ? [] : (payments.data ?? []);
  const commissionInPeriod = rows.reduce((s, e) => s + Number(e.commission_value), 0);
  const paidInPeriod = paidRows.reduce((s, p) => s + Number(p.amount), 0);
  const saldo = balance.data?.saldo ?? 0;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Meu financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suas comissões, seus recebimentos e o que ainda falta receber.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid grid-cols-2 divide-x divide-rule rounded-[16px] border border-rule bg-card">
          <Tile
            label="Comissão"
            value={formatBRL(commissionInPeriod)}
            caption="no período"
            accent="text-primary"
          />
          <Tile label="Recebido" value={formatBRL(paidInPeriod)} caption="no período" />
        </div>
        <div className="grid grid-cols-2 divide-x divide-rule rounded-[16px] border border-rule bg-card">
          <Tile
            label="A receber"
            value={formatBRL(Math.max(0, saldo))}
            caption="total acumulado"
            accent="text-warning"
          />
          <Tile
            label="Já recebido"
            value={formatBRL(balance.data?.paid ?? 0)}
            caption="desde o início"
            accent="text-success"
          />
        </div>
      </div>

      {saldo < -0.005 && (
        <p className="-mt-3 text-sm text-muted-foreground">
          Você está adiantada em{" "}
          <span className="figure font-medium text-foreground">{formatBRL(-saldo)}</span> —
          esse valor será descontado do próximo pagamento.
        </p>
      )}

      <div className="flex gap-1 self-start rounded-xl bg-muted p-1">
        {(["ganhos", "recebimentos"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              view === v
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      <PeriodPicker value={selection} onChange={setSelection} />

      {view === "ganhos" ? (
        <>
          <ForecastCards forecast={forecast.data} loading={forecast.isLoading} />

          <div>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              Comissões · {insightsLabel(selection)}
            </h2>
            <Card>
              <CardContent className="p-0">
                {earnings.isLoading ? (
                  <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
                ) : rows.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">
                    Nenhuma comissão registrada neste período.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {rows.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center justify-between gap-3 p-4 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {e.appointment?.service?.name ?? "Atendimento"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {e.appointment?.client_name_snapshot ?? "—"} ·{" "}
                            {format(new Date(e.earned_at), "d 'de' MMM", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="figure font-semibold text-primary">
                            {formatBRL(e.commission_value)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            de {formatBRL(e.gross_value)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Recebimentos · {insightsLabel(selection)}
            </h2>
            <span className="text-sm">
              <span className="text-muted-foreground">total </span>
              <span className="figure font-semibold text-success">
                {formatBRL(paidInPeriod)}
              </span>
            </span>
          </div>
          <Card>
            <CardContent className="p-0">
              {payments.isLoading ? (
                <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
              ) : paidRows.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum recebimento registrado neste período.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {paidRows.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{dayLabel(p.paid_at)}</p>
                        <p className="text-xs text-muted-foreground">
                          <span
                            className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              p.kind === "advance"
                                ? "bg-warning/15 text-warning"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {KIND_LABEL[p.kind]}
                          </span>
                          {p.method ? METHOD_LABEL[p.method] : ""}
                          {p.notes ? ` · ${p.notes}` : ""}
                        </p>
                      </div>
                      <span className="figure shrink-0 font-semibold text-success">
                        {formatBRL(Number(p.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <p className="mt-2 text-xs text-muted-foreground">
            Quem registra os pagamentos é a gestora. Se algum valor não bater,
            fale com ela — todo lançamento fica gravado com data e autor.
          </p>
        </div>
      )}
    </section>
  );
}
