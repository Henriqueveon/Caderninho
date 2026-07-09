import type {
  AvailabilityException,
  AvailabilityRule,
} from "@/types/database";

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface GenerateSlotsInput {
  /** Dia alvo à meia-noite no fuso do estúdio (America/Sao_Paulo). */
  date: Date;
  rules: Pick<AvailabilityRule, "weekday" | "start_time" | "end_time">[];
  exceptions: Pick<
    AvailabilityException,
    "date" | "start_time" | "end_time" | "type"
  >[];
  /** Períodos ocupados por atendimentos ativos (scheduled/confirmed/in_progress). */
  busy: TimeRange[];
  durationMinutes: number;
  stepMinutes?: number;
  now?: Date;
  minAdvanceHours?: number;
}

const DEFAULT_STEP_MINUTES = 15;
const MS_PER_MINUTE = 60_000;

/** "09:30:00" ou "09:30" → minutos desde meia-noite. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Data local → "YYYY-MM-DD" (mesmo formato da coluna date do Postgres). */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface MinuteRange {
  start: number;
  end: number;
}

function mergeRanges(ranges: MinuteRange[]): MinuteRange[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: MinuteRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function subtractRanges(
  ranges: MinuteRange[],
  blocks: MinuteRange[],
): MinuteRange[] {
  let result = ranges;
  for (const block of blocks) {
    const next: MinuteRange[] = [];
    for (const range of result) {
      if (block.end <= range.start || block.start >= range.end) {
        next.push(range);
        continue;
      }
      if (block.start > range.start) {
        next.push({ start: range.start, end: block.start });
      }
      if (block.end < range.end) {
        next.push({ start: block.end, end: range.end });
      }
    }
    result = next;
  }
  return result;
}

/**
 * Gera os horários de início disponíveis para um serviço em um dia.
 *
 * Algoritmo (Seção 6.2 do CLAUDE.md):
 * 1. Regras do weekday + exceções type='extra' formam a disponibilidade.
 * 2. Subtrai exceções type='block' e atendimentos ativos.
 * 3. Fatia os intervalos livres em slots de durationMinutes (passo de 15min).
 * 4. Remove slots no passado e que violem a antecedência mínima.
 */
export function generateSlots(input: GenerateSlotsInput): Date[] {
  const {
    date,
    rules,
    exceptions,
    busy,
    durationMinutes,
    stepMinutes = DEFAULT_STEP_MINUTES,
    now,
    minAdvanceHours = 0,
  } = input;

  const dateStr = toDateString(date);
  const dayStartMs = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const weekday = date.getDay();

  const dayExceptions = exceptions.filter((e) => e.date === dateStr);

  const available: MinuteRange[] = rules
    .filter((r) => r.weekday === weekday)
    .map((r) => ({
      start: timeToMinutes(r.start_time),
      end: timeToMinutes(r.end_time),
    }));

  for (const extra of dayExceptions.filter((e) => e.type === "extra")) {
    if (extra.start_time && extra.end_time) {
      available.push({
        start: timeToMinutes(extra.start_time),
        end: timeToMinutes(extra.end_time),
      });
    }
  }

  const blocks: MinuteRange[] = [];
  for (const block of dayExceptions.filter((e) => e.type === "block")) {
    // block sem horário = dia inteiro indisponível (folga)
    blocks.push({
      start: block.start_time ? timeToMinutes(block.start_time) : 0,
      end: block.end_time ? timeToMinutes(block.end_time) : 24 * 60,
    });
  }
  for (const b of busy) {
    const start = (b.start.getTime() - dayStartMs) / MS_PER_MINUTE;
    const end = (b.end.getTime() - dayStartMs) / MS_PER_MINUTE;
    if (end > 0 && start < 24 * 60) {
      blocks.push({ start: Math.max(0, start), end: Math.min(24 * 60, end) });
    }
  }

  const free = subtractRanges(mergeRanges(available), blocks);

  const earliestAllowedMs = now
    ? now.getTime() + minAdvanceHours * 60 * MS_PER_MINUTE
    : -Infinity;

  const slots: Date[] = [];
  for (const range of free) {
    for (
      let startMin = range.start;
      startMin + durationMinutes <= range.end;
      startMin += stepMinutes
    ) {
      const slotStart = new Date(dayStartMs + startMin * MS_PER_MINUTE);
      if (slotStart.getTime() >= earliestAllowedMs) {
        slots.push(slotStart);
      }
    }
  }
  return slots;
}
