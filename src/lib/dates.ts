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

/** Dia seguinte ao último dia do período, à meia-noite — o `end` exclusivo.
 *  `endOfX` devolve 23:59:59.999; somar um dia sem zerar a hora faria o
 *  intervalo engolir o primeiro dia do período seguinte. */
const dayAfter = (last: Date) => addDays(startOfDay(last), 1);

/** Intervalo cobrindo o período ancorado numa data. */
export function periodRange(anchor: Date, period: Period): DateRange {
  if (period === "day") {
    return { start: startOfDay(anchor), end: addDays(startOfDay(anchor), 1) };
  }
  if (period === "week") {
    return {
      start: startOfWeek(anchor, WEEK_OPTS),
      end: dayAfter(endOfWeek(anchor, WEEK_OPTS)),
    };
  }
  if (period === "quarter") {
    return { start: startOfQuarter(anchor), end: dayAfter(endOfQuarter(anchor)) };
  }
  if (period === "year") {
    return { start: startOfYear(anchor), end: dayAfter(endOfYear(anchor)) };
  }
  return { start: startOfMonth(anchor), end: dayAfter(endOfMonth(anchor)) };
}

// Semana útil do estúdio: segunda a sábado (domingo é folga). É assim que a
// equipe revisa os ganhos ("quanto vamos ganhar na semana"), não pelo mês.
const BIZ_WEEK = { weekStartsOn: 1 as const, locale: ptBR };

/** Intervalo seg 00:00 → dom 00:00 (exclusivo) — cobre segunda a sábado. */
export function businessWeekRange(anchor: Date): DateRange {
  const start = startOfWeek(anchor, BIZ_WEEK);
  return { start, end: addDays(start, 6) };
}

/** Os seis dias úteis (seg…sáb) da semana do anchor. */
export function businessWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, BIZ_WEEK);
  return eachDayOfInterval({ start, end: addDays(start, 5) });
}

/** Rótulo curto seg–sáb (ex.: "21–26 de julho"). */
export function businessWeekLabel(anchor: Date): string {
  const start = startOfWeek(anchor, BIZ_WEEK);
  const end = addDays(start, 5);
  if (isSameMonth(start, end)) {
    return `${format(start, "d", L)}–${format(end, "d 'de' MMMM", L)}`;
  }
  return `${format(start, "d MMM", L)} – ${format(end, "d MMM", L)}`;
}

// ---------------------------------------------------------------------------
// Período dos Insights
// ---------------------------------------------------------------------------
// A unidade natural do estúdio é a SEMANA ÚTIL (seg–sáb), então ela é o padrão.
// As outras existem para comparar recortes maiores; "custom" é o intervalo livre.

export type InsightsUnit = "week" | "month" | "quarter" | "year" | "custom";

export const INSIGHTS_UNIT_LABELS: Record<InsightsUnit, string> = {
  week: "Semana",
  month: "Mês",
  quarter: "Trimestre",
  year: "Ano",
  custom: "Escolher",
};

export interface InsightsSelection {
  unit: InsightsUnit;
  anchor: Date;
  /** Só para unit="custom": primeiro e último dia (ambos inclusivos). */
  start?: Date;
  end?: Date;
}

export const DEFAULT_INSIGHTS_SELECTION: InsightsSelection = {
  unit: "week",
  anchor: new Date(),
};

/** Intervalo coberto pela seleção (end exclusivo). */
export function insightsRange(sel: InsightsSelection): DateRange {
  if (sel.unit === "custom") {
    const start = startOfDay(sel.start ?? sel.anchor);
    const last = startOfDay(sel.end ?? sel.start ?? sel.anchor);
    // Datas invertidas pelo usuário não quebram nada: o intervalo se ordena.
    return start <= last
      ? { start, end: addDays(last, 1) }
      : { start: last, end: addDays(start, 1) };
  }
  if (sel.unit === "week") return businessWeekRange(sel.anchor);
  return periodRange(sel.anchor, sel.unit);
}

/** Move a seleção um período para trás/frente (custom desliza a própria janela). */
export function shiftInsights(
  sel: InsightsSelection,
  dir: -1 | 1,
): InsightsSelection {
  if (sel.unit === "custom") {
    const { start, end } = insightsRange(sel);
    const days = Math.max(1, Math.round((+end - +start) / 86400000));
    return {
      ...sel,
      start: addDays(start, dir * days),
      end: addDays(start, dir * days + days - 1),
    };
  }
  const anchor =
    sel.unit === "week"
      ? addWeeks(sel.anchor, dir)
      : sel.unit === "quarter"
        ? addQuarters(sel.anchor, dir)
        : sel.unit === "year"
          ? addYears(sel.anchor, dir)
          : addMonths(sel.anchor, dir);
  return { ...sel, anchor };
}

/** Rótulo humano da seleção (ex.: "10–15 de agosto", "Agosto de 2026"). */
export function insightsLabel(sel: InsightsSelection): string {
  if (sel.unit === "custom") {
    const { start, end } = insightsRange(sel);
    const last = addDays(end, -1);
    // Sem o ano, uma janela de 2024 fica idêntica à de 2026 na lista de
    // períodos anteriores — então ele aparece sempre que não for o ano corrente.
    const thisYear = new Date().getFullYear();
    const yr = (d: Date) => (d.getFullYear() === thisYear ? "" : ` ${d.getFullYear()}`);
    if (isSameDay(start, last)) return `${format(start, "d 'de' MMMM", L)}${yr(start)}`;
    if (isSameMonth(start, last)) {
      return `${format(start, "d", L)}–${format(last, "d 'de' MMMM", L)}${yr(last)}`;
    }
    return `${format(start, "d MMM", L)}${yr(start)} – ${format(last, "d MMM", L)}${yr(last)}`;
  }
  if (sel.unit === "week") return businessWeekLabel(sel.anchor);
  return periodLabel(sel.anchor, sel.unit);
}

export interface Bucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

/**
 * Fatia o intervalo nas colunas do gráfico: dias em janelas curtas, meses em
 * janelas longas. Na semana são só os seis dias úteis — domingo não entra.
 */
export function insightsBuckets(sel: InsightsSelection): Bucket[] {
  const { start, end } = insightsRange(sel);
  const days = Math.round((+end - +start) / 86400000);

  if (sel.unit === "week") {
    return businessWeekDays(sel.anchor).map((d) => ({
      key: format(d, "yyyy-MM-dd"),
      label: WEEKDAY_LABELS[d.getDay()],
      start: d,
      end: addDays(d, 1),
    }));
  }

  if (days <= 45) {
    return eachDayOfInterval({ start, end: addDays(end, -1) }).map((d) => ({
      key: format(d, "yyyy-MM-dd"),
      label: format(d, "d", L),
      start: d,
      end: addDays(d, 1),
    }));
  }

  const months: Bucket[] = [];
  let cursor = startOfMonth(start);
  while (cursor < end) {
    const next = addMonths(cursor, 1);
    months.push({
      key: format(cursor, "yyyy-MM"),
      label: format(cursor, "MMM", L),
      start: cursor < start ? start : cursor,
      end: next > end ? end : next,
    });
    cursor = next;
  }
  return months;
}

/** Tempo relativo humano para o futuro próximo: "agora", "em 40min", "em 2h", "amanhã 14:30", "sex 09:00". */
export function relativeTime(target: Date | string, base = new Date()): string {
  const d = typeof target === "string" ? new Date(target) : target;
  const diffMin = Math.round(differenceInMinutes(d, base));
  if (diffMin < -1) return timeLabel(d);
  if (diffMin <= 1) return "agora";
  if (diffMin < 60) return `em ${diffMin}min`;
  if (diffMin < 240 && isSameDay(d, base)) {
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return m === 0 ? `em ${h}h` : `em ${h}h${String(m).padStart(2, "0")}`;
  }
  if (isSameDay(d, base)) return `hoje ${timeLabel(d)}`;
  if (isSameDay(d, addDays(base, 1))) return `amanhã ${timeLabel(d)}`;
  return `${format(d, "EEE", L)} ${timeLabel(d)}`;
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
