import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments } from "@/hooks/useAgenda";
import { useEarnings } from "@/hooks/useFinance";
import { ACTIVE_STATUSES } from "@/components/agenda/status";
import { periodRange } from "@/lib/dates";
import { sumTotals } from "@/lib/finance";
import { formatBRL } from "@/lib/format";
import { isSameDay } from "date-fns";

export function AdminDashboard() {
  const { profile } = useAuth();
  const monthRange = useMemo(() => periodRange(new Date(), "month"), []);
  const dayRange = useMemo(() => periodRange(new Date(), "day"), []);

  const earnings = useEarnings(monthRange);
  const todayAppts = useAppointments(dayRange);

  const totals = sumTotals(earnings.data ?? []);
  const today = (todayAppts.data ?? []).filter((a) =>
    isSameDay(new Date(a.scheduled_start), new Date()),
  );
  const todayActive = today.filter((a) =>
    ACTIVE_STATUSES.includes(a.status),
  ).length;

  const cards = [
    { label: "Faturamento do mês", value: formatBRL(totals.gross) },
    { label: "Comissões do mês", value: formatBRL(totals.commission) },
    { label: "Parte do estúdio", value: formatBRL(totals.studio) },
    { label: "Atendimentos hoje", value: String(today.length) },
    { label: "Ainda por atender hoje", value: String(todayActive) },
    { label: "Concluídos no mês", value: String(totals.count) },
  ];

  return (
    <section>
      <h1 className="text-2xl font-semibold">
        Olá, {profile?.full_name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Visão geral do estúdio</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="tnums mt-1 text-3xl font-semibold">
                {earnings.isLoading ? "—" : c.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
