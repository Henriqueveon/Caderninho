import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  getQuarter,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export type Period = "day" | "week" | "month" | "quarter" | "year";

export const PERIOD_LABELS: Record<Period, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
  quarter: "Trimestre",
  year: "Ano",
};

const L = { locale: ptBR };

// Semana no padrão do calendário brasileiro (domingo = 0), alinhado ao
// weekday de availability_rules.
const WEEK_OPTS = { weekStartsOn: 0 as const, locale: ptBR };

export interface DateRange {
  start: Date;
  end: Date; // exclusivo (início do dia seguinte ao último)
}

/** Intervalo cobrindo o período ancorado numa data. */
export function periodRange(anchor: Date, period: Period): DateRange {
  if (period === "day") {
    return { start: startOfDay(anchor), end: addDays(startOfDay(anchor), 1) };
  }
  if (period === "week") {
    return {
      start: startOfWeek(anchor, WEEK_OPTS),
      end: addDays(endOfWeek(anchor, WEEK_OPTS), 1),
    };
  }
  if (period === "quarter") {
    return {
      start: startOfQuarter(anchor),
      end: addDays(endOfQuarter(anchor), 1),
    };
  }
  if (period === "year") {
    return { start: startOfYear(anchor), end: addDays(endOfYear(anchor), 1) };
  }
  return {
    start: startOfMonth(anchor),
    end: addDays(endOfMonth(anchor), 1),
  };
}

export function shiftPeriod(anchor: Date, period: Period, dir: -1 | 1): Date {
  if (period === "day") return addDays(anchor, dir);
  if (period === "week") return addWeeks(anchor, dir);
  if (period === "quarter") return addQuarters(anchor, dir);
  if (period === "year") return addYears(anchor, dir);
  return addMonths(anchor, dir);
}

/** Rótulo humano do período selecionado (ex: "9 de julho", "jul 2026"). */
export function periodLabel(anchor: Date, period: Period): string {
  if (period === "day") {
    return format(anchor, "EEEE, d 'de' MMMM", L).replace(/^\w/, (c) =>
      c.toUpperCase(),
    );
  }
  if (period === "week") {
    const { start } = periodRange(anchor, "week");
    const end = addDays(start, 6);
    if (isSameMonth(start, end)) {
      return `${format(start, "d", L)}–${format(end, "d 'de' MMMM", L)}`;
    }
    return `${format(start, "d MMM", L)} – ${format(end, "d MMM", L)}`;
  }
  if (period === "quarter") {
    return `${getQuarter(anchor)}º trimestre de ${format(anchor, "yyyy")}`;
  }
  if (period === "year") {
    return format(anchor, "yyyy");
  }
  return format(anchor, "MMMM 'de' yyyy", L).replace(/^\w/, (c) =>
    c.toUpperCase(),
  );
}

/** Como agrupar o gráfico: por dia (janelas curtas) ou por mês (longas). */
export function seriesBucket(period: Period): "day" | "month" {
  return period === "quarter" || period === "year" ? "month" : "day";
}

export function daysOfWeek(anchor: Date): Date[] {
  const { start } = periodRange(anchor, "week");
  return eachDayOfInterval({ start, end: addDays(start, 6) });
}

/** Matriz de semanas (cada uma com 7 dias) cobrindo o mês do anchor. */
export function monthMatrix(anchor: Date): Date[][] {
  const first = startOfWeek(startOfMonth(anchor), WEEK_OPTS);
  const last = endOfWeek(endOfMonth(anchor), WEEK_OPTS);
  const all = eachDayOfInterval({ start: first, end: last });
  const weeks: Date[][] = [];
  for (let i = 0; i < all.length; i += 7) weeks.push(all.slice(i, i + 7));
  return weeks;
}

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const WEEKDAY_LABELS_LONG = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export function timeLabel(d: Date | string): string {
  return format(typeof d === "string" ? new Date(d) : d, "HH:mm");
}

export function dayNumber(d: Date): string {
  return format(d, "d", L);
}

/** "HH:MM" (input time) → minutos desde a meia-noite. */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function durationMinutes(startISO: string, endISO: string): number {
  return differenceInMinutes(new Date(endISO), new Date(startISO));
}

export { isSameDay, isSameMonth, startOfDay, format };
