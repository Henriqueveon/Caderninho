import { useMemo } from "react";
import {
  addDays,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { useAuth } from "@/contexts/AuthContext";
import { type AppointmentRow, useAppointments, useProfessionals } from "@/hooks/useAgenda";
import { type EarningRow, useEarnings } from "@/hooks/useFinance";
import { useGoals } from "@/hooks/useGoals";
import { computeEarning } from "@/lib/earnings";
import {
  businessWeekDays,
  businessWeekRange,
  isSameDay,
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
  weekTotal: number;
  weekDeltaPct: number | null;
  weekGuaranteed: number; // já garantido: projeção dos agendados restantes da semana
  monthTotal: number;
  weekDays: DayPoint[];
  weeklyTrend: DayPoint[];
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

/**
 * Métricas do painel, orientadas à SEMANA ÚTIL (seg–sáb) — que é como a equipe
 * revisa os ganhos. `professionalId` definido = visão da profissional (comissão);
 * indefinido = visão da gestora (faturamento do estúdio).
 */
export function useInsights(professionalId?: string): Insights {
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner";
  const metric: "commission" | "gross" = isOwner ? "gross" : "commission";

  const now = useMemo(() => new Date(), []);
  // Cobre as 8 semanas da tendência E os 60 dias das métricas de hábito —
  // o que for mais antigo, para nenhum recorte ficar com dados pela metade.
  const wideRange = useMemo(() => {
    const weekStart = startOfWeek(subWeeks(now, 7), { weekStartsOn: 1 });
    const days60 = subDays(now, 60);
    return { start: weekStart < days60 ? weekStart : days60, end: addDays(now, 1) };
  }, [now]);
  const histRange = useMemo(() => ({ start: subDays(now, 60), end: addDays(now, 1) }), [now]);
  const aheadRange = useMemo(() => ({ start: now, end: addDays(now, 45) }), [now]);

  const earnings = useEarnings(wideRange, professionalId);
  const hist = useAppointments(histRange, professionalId);
  const ahead = useAppointments(aheadRange, professionalId);
  const pros = useProfessionals();
  const goals = useGoals(now);

  return useMemo(() => {
    const metricOf = (e: EarningRow) =>
      metric === "gross" ? Number(e.gross_value) : Number(e.commission_value);

    const earns = earnings.data ?? [];
    const histAppts = hist.data ?? [];
    const aheadAppts = ahead.data ?? [];

    const since60 = subDays(now, 60);
    const earns60 = earns.filter((e) => new Date(e.earned_at) >= since60);

    const week = businessWeekRange(now);
    const lastWeekStart = subWeeks(week.start, 1);
    const monthStart = startOfMonth(now);
    const todayNum = now.getDay();
    // dia da semana útil já decorrido (seg=0 … sáb=5); domingo conta como semana cheia
    const bizElapsed = todayNum === 0 ? 6 : todayNum; // seg=1..sáb=6

    // ---- semana atual (seg–sáb) por dia ----
    const weekDays: DayPoint[] = businessWeekDays(now).map((d) => ({
      key: dayKey(d),
      label: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][(d.getDay() + 6) % 7],
      value: earns
        .filter((e) => isSameDay(new Date(e.earned_at), d))
        .reduce((s, e) => s + metricOf(e), 0),
      isToday: isSameDay(d, now),
    }));
    const weekTotal = weekDays.reduce((s, d) => s + d.value, 0);

    // ---- semana passada, mesmo período decorrido (delta justo) ----
    const lastWeekSame = earns
      .filter((e) => {
        const t = new Date(e.earned_at);
        return t >= lastWeekStart && t < addDays(lastWeekStart, bizElapsed);
      })
      .reduce((s, e) => s + metricOf(e), 0);
    const weekDeltaPct =
      lastWeekSame > 0 ? ((weekTotal - lastWeekSame) / lastWeekSame) * 100 : null;

    // ---- já garantido: comissão/valor projetado dos agendados restantes da semana ----
    const weekGuaranteed = aheadAppts
      .filter((a) => {
        const t = new Date(a.scheduled_start);
        return (
          t >= now &&
          t < week.end &&
          (ACTIVE as readonly string[]).includes(a.status)
        );
      })
      .reduce((s, a) => {
        const c = computeEarning(a.price_snapshot, a.commission_pct_snapshot).commission;
        return s + (metric === "gross" ? a.price_snapshot : c);
      }, 0);

    // ---- mês corrente (número secundário) ----
    const monthTotal = earns
      .filter((e) => new Date(e.earned_at) >= monthStart)
      .reduce((s, e) => s + metricOf(e), 0);

    // ---- tendência: últimas 8 semanas úteis ----
    const weeklyTrend: DayPoint[] = [];
    for (let i = 7; i >= 0; i--) {
      const wStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const wEnd = addDays(wStart, 6);
      const value = earns
        .filter((e) => {
          const t = new Date(e.earned_at);
          return t >= wStart && t < wEnd;
        })
        .reduce((s, e) => s + metricOf(e), 0);
      weeklyTrend.push({
        key: dayKey(wStart),
        label: format(wStart, "dd/MM", { locale: ptBR }),
        value,
        isToday: i === 0,
      });
    }

    // ---- movimento por dia da semana (últimos 60 dias) ----
    // Domingo (idx 6) entra no sábado? Não: o estúdio não abre domingo, então
    // um lançamento de domingo é exceção e fica de fora deste recorte.
    const wdTotals = [0, 0, 0, 0, 0, 0]; // seg..sáb
    for (const e of earns60) {
      const d = new Date(e.earned_at);
      const idx = (d.getDay() + 6) % 7; // seg=0..dom=6
      if (idx < 6) wdTotals[idx] += metricOf(e);
    }
    const byWeekday: DayPoint[] = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
      (label, i) => ({ key: label, label, value: wdTotals[i] }),
    );

    // ---- atendimentos concluídos (60d): serviços, comparecimento, clientes ----
    const doneAppts = histAppts.filter((a) => a.status === "done");
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
    const topServices = [...svcMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const doneCount = doneAppts.length;
    const noShow = histAppts.filter((a) => a.status === "no_show").length;
    const attendanceRate =
      doneCount + noShow > 0 ? (doneCount / (doneCount + noShow)) * 100 : null;
    const clientsServed = new Set(
      doneAppts.map((a) => a.client_record_id ?? a.client_name_snapshot ?? a.id),
    ).size;

    // ---- ticket médio (métrica por atendimento concluído, 60d) ----
    const ticketMedio =
      earns60.length > 0
        ? earns60.reduce((s, e) => s + metricOf(e), 0) / earns60.length
        : 0;

    // ---- melhor dia (60d) ----
    const perDay = new Map<string, number>();
    for (const e of earns60) {
      const k = dayKey(new Date(e.earned_at));
      perDay.set(k, (perDay.get(k) ?? 0) + metricOf(e));
    }
    let bestDay: { label: string; value: number } | null = null;
    for (const [k, v] of perDay) {
      if (!bestDay || v > bestDay.value) {
        bestDay = { label: format(new Date(k + "T12:00:00"), "dd/MM", { locale: ptBR }), value: v };
      }
    }

    // ---- sequência (dias úteis seguidos com ≥1 concluído) ----
    const doneDays = new Set(
      doneAppts.map((a) => dayKey(new Date(a.scheduled_start))),
    );
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = subDays(now, i);
      if (d.getDay() === 0) continue; // pula domingo
      if (doneDays.has(dayKey(d))) streak += 1;
      else if (i > 0) break; // hoje ainda sem atendimento não zera
    }

    // ---- hoje ----
    const todayAppts = histAppts.filter((a) => isSameDay(new Date(a.scheduled_start), now));
    const todayDone = todayAppts.filter((a) => a.status === "done").length;
    const todayRemaining = todayAppts.filter((a) =>
      (ACTIVE as readonly string[]).includes(a.status),
    );
    const toReceive = todayRemaining.reduce((s, a) => {
      const c = computeEarning(a.price_snapshot, a.commission_pct_snapshot).commission;
      return s + (metric === "gross" ? a.price_snapshot : c);
    }, 0);

    // ---- meta do mês (profissional) ----
    let goal: Insights["goal"] = null;
    if (professionalId) {
      const g = (goals.data ?? []).find((x) => x.professional_id === professionalId);
      if (g) {
        const monthDone = earns.filter((e) => new Date(e.earned_at) >= monthStart);
        const current =
          g.target_type === "appointments"
            ? monthDone.length
            : monthDone.reduce((s, e) => s + Number(e.gross_value), 0);
        goal = {
          type: g.target_type,
          target: Number(g.target_value),
          current,
          pct: g.target_value > 0 ? Math.min(100, (current / Number(g.target_value)) * 100) : 0,
        };
      }
    }

    // ---- equipe (gestora): ranking da semana ----
    let team: TeamPoint[] | null = null;
    if (isOwner) {
      const byPro = new Map<string, { value: number; count: number }>();
      for (const e of earns) {
        const t = new Date(e.earned_at);
        if (t >= week.start && t < week.end) {
          const cur = byPro.get(e.professional_id) ?? { value: 0, count: 0 };
          cur.value += metricOf(e);
          cur.count += 1;
          byPro.set(e.professional_id, cur);
        }
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
      weekTotal,
      weekDeltaPct,
      weekGuaranteed,
      monthTotal,
      weekDays,
      weeklyTrend,
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
