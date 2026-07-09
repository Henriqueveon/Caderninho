import { useQuery } from "@tanstack/react-query";
import { addDays, endOfMonth, startOfMonth, subDays } from "date-fns";

import type { DateRange } from "@/lib/dates";
import { computeEarning } from "@/lib/earnings";
import { generateSlots } from "@/lib/slots";
import { supabase } from "@/lib/supabase";
import type {
  AvailabilityException,
  AvailabilityRule,
} from "@/types/database";

export interface EarningRow {
  id: string;
  professional_id: string;
  gross_value: number;
  commission_value: number;
  studio_value: number;
  earned_at: string;
  appointment: {
    client_name_snapshot: string | null;
    service: { name: string } | null;
  } | null;
}

/** Earnings num intervalo. RLS já escopa: owner vê tudo, profissional só o seu. */
export function useEarnings(range: DateRange, professionalId?: string) {
  return useQuery({
    queryKey: [
      "earnings",
      range.start.toISOString(),
      range.end.toISOString(),
      professionalId ?? "all",
    ],
    queryFn: async (): Promise<EarningRow[]> => {
      let q = supabase
        .from("earnings")
        .select(
          "id, professional_id, gross_value, commission_value, studio_value, earned_at, appointment:appointment_id(client_name_snapshot, service:service_id(name))",
        )
        .gte("earned_at", range.start.toISOString())
        .lt("earned_at", range.end.toISOString())
        .order("earned_at", { ascending: false });
      if (professionalId) q = q.eq("professional_id", professionalId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as EarningRow[]) ?? [];
    },
  });
}

export interface Forecast {
  realizado: number;
  agendado: number;
  potencial: number;
}

/**
 * Previsibilidade de ganhos da profissional no mês corrente (Seção 6.4):
 * Realizado (earnings), Já garantido (agendados futuros) e Potencial
 * (capacidade livre restante × ticket médio de comissão).
 */
export function useForecast(professionalId?: string) {
  return useQuery({
    queryKey: ["forecast", professionalId],
    enabled: !!professionalId,
    queryFn: async (): Promise<Forecast> => {
      const pid = professionalId!;
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEndExcl = addDays(endOfMonth(now), 1);

      // Realizado: comissão dos earnings do mês
      const earn = await supabase
        .from("earnings")
        .select("commission_value")
        .eq("professional_id", pid)
        .gte("earned_at", monthStart.toISOString())
        .lt("earned_at", monthEndExcl.toISOString());
      const realizado = (earn.data ?? []).reduce(
        (s, e) => s + Number(e.commission_value),
        0,
      );

      // Agendado: comissão projetada dos atendimentos futuros do mês
      const future = await supabase
        .from("appointments")
        .select("price_snapshot, commission_pct_snapshot, scheduled_start, scheduled_end, status")
        .eq("professional_id", pid)
        .gte("scheduled_start", now.toISOString())
        .lt("scheduled_start", monthEndExcl.toISOString())
        .in("status", ["scheduled", "confirmed", "in_progress"]);
      const futureAppts = future.data ?? [];
      const agendado = futureAppts
        .filter((a) => a.status === "scheduled" || a.status === "confirmed")
        .reduce(
          (s, a) =>
            s +
            computeEarning(Number(a.price_snapshot), Number(a.commission_pct_snapshot))
              .commission,
          0,
        );

      // Ticket médio de comissão: últimos 60 dias; sem histórico, média dos serviços
      const since = subDays(now, 60);
      const hist = await supabase
        .from("earnings")
        .select("commission_value")
        .eq("professional_id", pid)
        .gte("earned_at", since.toISOString());
      const histRows = hist.data ?? [];

      let avgTicket = 0;
      let avgDuration = 60;
      if (histRows.length > 0) {
        avgTicket =
          histRows.reduce((s, e) => s + Number(e.commission_value), 0) /
          histRows.length;
      }

      // serviços da profissional (para fallback do ticket e duração média)
      const svc = await supabase
        .from("professional_services")
        .select("service:service_id(price, duration_minutes, commission_pct_override)")
        .eq("professional_id", pid);
      type SvcLite = {
        price: number;
        duration_minutes: number;
        commission_pct_override: number | null;
      };
      const services = (svc.data ?? [])
        .map((r) => {
          // embed to-one pode vir como objeto ou array conforme a inferência
          const s = (r as unknown as { service: SvcLite | SvcLite[] | null })
            .service;
          return Array.isArray(s) ? (s[0] ?? null) : s;
        })
        .filter(Boolean) as SvcLite[];

      if (services.length > 0) {
        avgDuration = Math.round(
          services.reduce((s, x) => s + x.duration_minutes, 0) / services.length,
        );
        if (avgTicket === 0) {
          // comissão média por serviço usando o pct base da profissional
          const prof = await supabase
            .from("professionals")
            .select("commission_pct")
            .eq("id", pid)
            .single();
          const basePct = Number(prof.data?.commission_pct ?? 50);
          avgTicket =
            services.reduce(
              (s, x) =>
                s +
                computeEarning(x.price, x.commission_pct_override ?? basePct)
                  .commission,
              0,
            ) / services.length;
        }
      }

      // Potencial: capacidade livre restante no mês × ticket médio
      const rulesRes = await supabase
        .from("availability_rules")
        .select("weekday, start_time, end_time")
        .eq("professional_id", pid);
      const excRes = await supabase
        .from("availability_exceptions")
        .select("date, start_time, end_time, type")
        .eq("professional_id", pid);
      const rules = (rulesRes.data ?? []) as Pick<
        AvailabilityRule,
        "weekday" | "start_time" | "end_time"
      >[];
      const exceptions = (excRes.data ?? []) as Pick<
        AvailabilityException,
        "date" | "start_time" | "end_time" | "type"
      >[];

      const busy = futureAppts.map((a) => ({
        start: new Date(a.scheduled_start),
        end: new Date(a.scheduled_end),
      }));

      let freeCapacity = 0;
      for (
        let d = new Date(Math.max(now.getTime(), monthStart.getTime()));
        d < monthEndExcl;
        d = addDays(startOfDayLocal(d), 1)
      ) {
        const day = startOfDayLocal(d);
        // slots back-to-back (passo = duração) = capacidade não sobreposta
        const slots = generateSlots({
          date: day,
          rules,
          exceptions,
          busy,
          durationMinutes: avgDuration,
          stepMinutes: avgDuration,
          now,
          minAdvanceHours: 0,
        });
        freeCapacity += slots.length;
      }

      const potencial = freeCapacity * avgTicket;
      return {
        realizado: round2(realizado),
        agendado: round2(agendado),
        potencial: round2(potencial),
      };
    },
  });
}

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
