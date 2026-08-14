import { useMemo } from "react";
import { addDays, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useAuth } from "@/contexts/AuthContext";
import { type AppointmentRow, useAppointments, useProfessionals } from "@/hooks/useAgenda";
import { type EarningRow, useEarnings } from "@/hooks/useFinance";
import { useGoals } from "@/hooks/useGoals";
import { computeEarning } from "@/lib/earnings";
import {
  type Bucket,
  DEFAULT_INSIGHTS_SELECTION,
  type InsightsSelection,
  insightsBuckets,
  insightsLabel,
  insightsRange,
  isSameDay,
  shiftInsights,
} from "@/lib/dates";

export interface DayPoint {
  key: string;
  label: string;
  value: number;
  isToday?: boolean;
}
export interface ServicePoint {
  name: string;
  count: number;
  revenue: number;
}
export interface TeamPoint {
  id: string;
  name: string;
  color: string;
  value: number;
  count: number;
}

export interface Insights {
  isLoading: boolean;
  metric: "commission" | "gross";
  /** Rótulo humano do período selecionado (ex.: "10–15 de agosto"). */
  periodLabel: string;
  /** Nome do período no comparativo (ex.: "semana passada", "mês anterior"). */
  previousLabel: string;
  total: number;
  deltaPct: number | null;
  /** Agendados que ainda vão acontecer dentro do período. */
  guaranteed: number;
  monthTotal: number;
  /** Colunas do período: dias na semana/mês, meses em trimestre/ano. */
  series: DayPoint[];
  /** Os 8 períodos anteriores do mesmo tamanho (5 quando o período é o ano). */
  trend: DayPoint[];
  byWeekday: DayPoint[];
  topServices: ServicePoint[];
  today: { total: number; done: number; remaining: number; toReceive: number };
  goal:
    | { pct: number; current: number; target: number; type: "revenue" | "appointments" }
    | null;
  streak: number;
  bestDay: { label: string; value: number } | null;
  ticketMedio: number;
  attendanceRate: number | null;
  clientsServed: number;
  doneCount: number;
  team: TeamPoint[] | null;
  upcoming: AppointmentRow[];
}

const ACTIVE = ["scheduled", "confirmed", "in_progress"] as const;
const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const PREVIOUS_LABEL: Record<InsightsSelection["unit"], string> = {
  week: "semana anterior",
  month: "mês anterior",
  quarter: "trimestre anterior",
  year: "ano anterior",
  custom: "período anterior",
};

/**
 * Métricas do painel para o período escolhido. O padrão é a SEMANA ÚTIL
 * (seg–sáb) — que é como a equipe revisa os ganhos —, mas tudo aqui recalcula
 * para qualquer recorte: mês, trimestre, ano ou intervalo livre.
 *
 * `professionalId` definido = visão da profissional (comissão);
 * indefinido = visão da gestora (faturamento do estúdio).
 */
export function useInsights(
  professionalId?: string,
  selection: InsightsSelection = DEFAULT_INSIGHTS_SELECTION,
): Insights {
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner";
  const metric: "commission" | "gross" = isOwner ? "gross" : "commission";

  const now = useMemo(() => new Date(), []);
  const range = useMemo(() => insightsRange(selection), [selection]);
  const buckets = useMemo(() => insightsBuckets(selection), [selection]);

  // Janelas anteriores da tendência. Recortes longos puxam menos janelas —
  // mais que isso é história antiga e uma query enorme à toa.
  const trendWindows = useMemo(() => {
    const windowDays = (+range.end - +range.start) / 86400000;
    const count = selection.unit === "year" || windowDays > 120 ? 5 : 8;
    const out: { sel: InsightsSelection; start: Date; end: Date }[] = [];
    let sel = selection;
    for (let i = 0; i < count; i++) {
      const r = insightsRange(sel);
      out.unshift({ sel, start: r.start, end: r.end });
      sel = shiftInsights(sel, -1);
    }
    return out;
  }, [selection, range.start, range.end]);

  // Uma única busca cobre período + tendência + hoje.
  const earningsRange = useMemo(() => {
    const start = trendWindows[0].start;
    const end = range.end > now ? range.end : addDays(now, 1);
    return { start, end };
  }, [trendWindows, range.end, now]);

  const apptRange = useMemo(() => {
    const today = startOfDay(now);
    return {
      start: range.start < today ? range.start : today,
      end: range.end > now ? range.end : addDays(now, 1),
    };
  }, [range.start, range.end, now]);

  const aheadRange = useMemo(() => {
    const end = addDays(now, 45);
    return { start: now, end: range.end > end ? range.end : end };
  }, [now, range.end]);

  const earnings = useEarnings(earningsRange, professionalId);
  const hist = useAppointments(apptRange, professionalId);
  const ahead = useAppointments(aheadRange, professionalId);
  const pros = useProfessionals();
  const goals = useGoals(now);

  return useMemo(() => {
    const metricOf = (e: EarningRow) =>
      metric === "gross" ? Number(e.gross_value) : Number(e.commission_value);
    const sumBetween = (rows: EarningRow[], start: Date, end: Date) =>
      rows
        .filter((e) => {
          const t = new Date(e.earned_at);
          return t >= start && t < end;
        })
        .reduce((s, e) => s + metricOf(e), 0);

    const allEarns = earnings.data ?? [];
    const histAppts = hist.data ?? [];
    const aheadAppts = ahead.data ?? [];

    // Tudo que é métrica do período olha só para esta fatia.
    const earns = allEarns.filter((e) => {
      const t = new Date(e.earned_at);
      return t >= range.start && t < range.end;
    });
    const appts = histAppts.filter((a) => {
      const t = new Date(a.scheduled_start);
      return t >= range.start && t < range.end;
    });

    const total = earns.reduce((s, e) => s + metricOf(e), 0);
    const monthStart = startOfMonth(now);

    // ---- colunas do período ----
    const series: DayPoint[] = buckets.map((b: Bucket) => ({
      key: b.key,
      label: b.label,
      value: sumBetween(earns, b.start, b.end),
      isToday: now >= b.start && now < b.end,
    }));

    // ---- comparativo com o período anterior, no mesmo ponto decorrido ----
    // Se o período ainda está correndo, compara só a parte equivalente — senão
    // uma semana pela metade sempre pareceria queda.
    const elapsed = Math.min(+now, +range.end) - +range.start;
    const previous = trendWindows[trendWindows.length - 2];
    const previousTotal = previous
      ? sumBetween(
          allEarns,
          previous.start,
          new Date(+previous.start + Math.max(0, elapsed)),
        )
      : 0;
    const deltaPct =
      previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;

    // ---- já garantido: agendados que ainda vão acontecer dentro do período ----
    const guaranteed = aheadAppts
      .filter((a) => {
        const t = new Date(a.scheduled_start);
        return (
          t >= now &&
          t < range.end &&
          (ACTIVE as readonly string[]).includes(a.status)
        );
      })
      .reduce((s, a) => {
        const c = computeEarning(a.price_snapshot, a.commission_pct_snapshot).commission;
        return s + (metric === "gross" ? a.price_snapshot : c);
      }, 0);

    const monthTotal = sumBetween(allEarns, monthStart, addDays(now, 1));

    // ---- tendência: os períodos anteriores do mesmo tamanho ----
    const trend: DayPoint[] = trendWindows.map((w, i) => ({
      key: `${+w.start}`,
      label: insightsLabel(w.sel),
      value: sumBetween(allEarns, w.start, w.end),
      isToday: i === trendWindows.length - 1,
    }));

    // ---- movimento por dia da semana, dentro do período ----
    const wdTotals = [0, 0, 0, 0, 0, 0]; // seg..sáb
    for (const e of earns) {
      const idx = (new Date(e.earned_at).getDay() + 6) % 7; // seg=0..dom=6
      if (idx < 6) wdTotals[idx] += metricOf(e); // o estúdio não abre domingo
    }
    const byWeekday: DayPoint[] = WEEKDAYS.map((label, i) => ({
      key: label,
      label,
      value: wdTotals[i],
    }));

    // ---- atendimentos concluídos no período ----
    const doneAppts = appts.filter((a) => a.status === "done");
    const svcMap = new Map<string, ServicePoint>();
    for (const a of doneAppts) {
      const items =
        a.items && a.items.length
          ? a.items
          : a.service
            ? [{ name_snapshot: a.service.name, price: a.price_snapshot }]
            : [];
      for (const it of items) {
        const name = (it as { name_snapshot?: string }).name_snapshot ?? "Serviço";
        const price = Number((it as { price?: number }).price ?? 0);
        const cur = svcMap.get(name) ?? { name, count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += price;
        svcMap.set(name, cur);
      }
    }
    const topServices = [...svcMap.values()].sort((a, b) => b.count - a.count).slice(0, 6);

    const doneCount = doneAppts.length;
    const noShow = appts.filter((a) => a.status === "no_show").length;
    const attendanceRate =
      doneCount + noShow > 0 ? (doneCount / (doneCount + noShow)) * 100 : null;
    const clientsServed = new Set(
      doneAppts.map((a) => a.client_record_id ?? a.client_name_snapshot ?? a.id),
    ).size;

    const ticketMedio = earns.length > 0 ? total / earns.length : 0;

    // ---- melhor dia do período ----
    const perDay = new Map<string, number>();
    for (const e of earns) {
      const k = dayKey(new Date(e.earned_at));
      perDay.set(k, (perDay.get(k) ?? 0) + metricOf(e));
    }
    let bestDay: { label: string; value: number } | null = null;
    for (const [k, v] of perDay) {
      if (!bestDay || v > bestDay.value) {
        bestDay = {
          label: format(new Date(`${k}T12:00:00`), "dd/MM", { locale: ptBR }),
          value: v,
        };
      }
    }

    // ---- sequência de dias úteis com atendimento (sempre a partir de hoje) ----
    const doneDays = new Set(
      histAppts
        .filter((a) => a.status === "done")
        .map((a) => dayKey(new Date(a.scheduled_start))),
    );
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = subDays(now, i);
      if (d.getDay() === 0) continue; // pula domingo
      if (doneDays.has(dayKey(d))) streak += 1;
      else if (i > 0) break; // hoje ainda sem atendimento não zera
    }

    // ---- hoje (independe do período escolhido) ----
    const todayAppts = histAppts.filter((a) => isSameDay(new Date(a.scheduled_start), now));
    const todayDone = todayAppts.filter((a) => a.status === "done").length;
    const todayRemaining = todayAppts.filter((a) =>
      (ACTIVE as readonly string[]).includes(a.status),
    );
    const toReceive = todayRemaining.reduce((s, a) => {
      const c = computeEarning(a.price_snapshot, a.commission_pct_snapshot).commission;
      return s + (metric === "gross" ? a.price_snapshot : c);
    }, 0);

    // ---- meta do mês (profissional) — sempre mensal, por definição ----
    let goal: Insights["goal"] = null;
    if (professionalId) {
      const g = (goals.data ?? []).find((x) => x.professional_id === professionalId);
      if (g) {
        const monthEarns = allEarns.filter((e) => new Date(e.earned_at) >= monthStart);
        const current =
          g.target_type === "appointments"
            ? monthEarns.length
            : monthEarns.reduce((s, e) => s + Number(e.gross_value), 0);
        goal = {
          type: g.target_type,
          target: Number(g.target_value),
          current,
          pct: g.target_value > 0 ? Math.min(100, (current / Number(g.target_value)) * 100) : 0,
        };
      }
    }

    // ---- equipe (gestora): ranking do período ----
    let team: TeamPoint[] | null = null;
    if (isOwner) {
      const byPro = new Map<string, { value: number; count: number }>();
      for (const e of earns) {
        const cur = byPro.get(e.professional_id) ?? { value: 0, count: 0 };
        cur.value += metricOf(e);
        cur.count += 1;
        byPro.set(e.professional_id, cur);
      }
      team = (pros.data ?? [])
        .map((p) => ({
          id: p.id,
          name: p.full_name,
          color: p.color,
          value: byPro.get(p.id)?.value ?? 0,
          count: byPro.get(p.id)?.count ?? 0,
        }))
        .sort((a, b) => b.value - a.value);
    }

    // ---- próximos agendamentos ----
    const upcoming = aheadAppts
      .filter(
        (a) =>
          new Date(a.scheduled_start) >= now &&
          (ACTIVE as readonly string[]).includes(a.status),
      )
      .sort(
        (a, b) =>
          new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime(),
      )
      .slice(0, 6);

    return {
      isLoading: earnings.isLoading || hist.isLoading || ahead.isLoading,
      metric,
      periodLabel: insightsLabel(selection),
      previousLabel: PREVIOUS_LABEL[selection.unit],
      total,
      deltaPct,
      guaranteed,
      monthTotal,
      series,
      trend,
      byWeekday,
      topServices,
      today: {
        total: todayAppts.length,
        done: todayDone,
        remaining: todayRemaining.length,
        toReceive,
      },
      goal,
      streak,
      bestDay,
      ticketMedio,
      attendanceRate,
      clientsServed,
      doneCount,
      team,
      upcoming,
    };
  }, [
    metric,
    isOwner,
    professionalId,
    selection,
    range,
    buckets,
    trendWindows,
    now,
    earnings.data,
    earnings.isLoading,
    hist.data,
    hist.isLoading,
    ahead.data,
    ahead.isLoading,
    pros.data,
    goals.data,
  ]);
}
