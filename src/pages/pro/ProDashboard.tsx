import { useMemo } from "react";

import { ForecastCards } from "@/components/finance/ForecastCards";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments, useMyProfessional } from "@/hooks/useAgenda";
import { useForecast } from "@/hooks/useFinance";
import { periodRange, timeLabel } from "@/lib/dates";
import { STATUS_META } from "@/components/agenda/status";
import { isSameDay } from "date-fns";

export function ProDashboard() {
  const { profile } = useAuth();
  const myPro = useMyProfessional();
  const forecast = useForecast(myPro.data?.id);

  const todayRange = useMemo(() => periodRange(new Date(), "day"), []);
  const appts = useAppointments(todayRange, myPro.data?.id);
  const today = (appts.data ?? []).filter((a) =>
    isSameDay(new Date(a.scheduled_start), new Date()),
  );

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Olá, {profile?.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seus ganhos e sua agenda de hoje
        </p>
      </div>

      <ForecastCards forecast={forecast.data} loading={forecast.isLoading} />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Hoje
        </h2>
        <Card>
          <CardContent className="p-0">
            {today.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Nenhum atendimento hoje.
              </p>
            ) : (
              <ul className="divide-y">
                {today.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 p-4 text-sm">
                    <span className="tnums w-12 font-medium">
                      {timeLabel(a.scheduled_start)}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">
                        {a.client_name_snapshot ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.service?.name}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[a.status].badge}`}
                    >
                      {STATUS_META[a.status].label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
