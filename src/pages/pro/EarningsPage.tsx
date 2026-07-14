import { ForecastCards } from "@/components/finance/ForecastCards";
import { Card, CardContent } from "@/components/ui/card";
import { useMyProfessional } from "@/hooks/useAgenda";
import { useEarnings, useForecast } from "@/hooks/useFinance";
import { KIND_LABEL, METHOD_LABEL, usePayments } from "@/hooks/usePayments";
import { periodRange } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

export function EarningsPage() {
  const myPro = useMyProfessional();
  const forecast = useForecast(myPro.data?.id);

  const monthRange = useMemo(() => periodRange(new Date(), "month"), []);
  const earnings = useEarnings(monthRange, myPro.data?.id);
  const rows = earnings.data ?? [];
  const payments = usePayments(monthRange, myPro.data?.id);
  const paid = (payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Meus ganhos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Previsibilidade do mês e extrato de comissões.
        </p>
      </div>

      <ForecastCards forecast={forecast.data} loading={forecast.isLoading} />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Extrato do mês
        </h2>
        <Card>
          <CardContent className="p-0">
            {earnings.isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
            ) : rows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Nenhuma comissão registrada neste mês ainda.
              </p>
            ) : (
              <ul className="divide-y">
                {rows.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between p-4 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {e.appointment?.service?.name ?? "Atendimento"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.appointment?.client_name_snapshot ?? "—"} ·{" "}
                        {format(new Date(e.earned_at), "d 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tnums font-semibold text-primary">
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

      {!payments.isError && (payments.data ?? []).length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Recebimentos do mês
            </h2>
            <span className="text-sm">
              <span className="text-muted-foreground">total </span>
              <span className="tnums font-semibold text-success">
                {formatBRL(paid)}
              </span>
            </span>
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {payments.data!.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between p-4 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {KIND_LABEL[p.kind]}
                        {p.method && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {METHOD_LABEL[p.method]}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(`${p.paid_at}T00:00:00`), "d 'de' MMM", {
                          locale: ptBR,
                        })}
                        {p.notes ? ` · ${p.notes}` : ""}
                      </p>
                    </div>
                    <p className="tnums font-semibold text-success">
                      {formatBRL(Number(p.amount))}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
