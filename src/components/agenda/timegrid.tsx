import { minutesOfDay, timeLabel } from "@/lib/dates";
import type { AppointmentRow } from "@/hooks/useAgenda";
import { STATUS_META } from "./status";

export const HOUR_PX = 56;

export interface HourRange {
  start: number; // hora inicial (0–24)
  end: number; // hora final (0–24)
}

/** Faixa padrão exibida quando não há atendimentos fora dela. */
export const DEFAULT_RANGE: HourRange = { start: 8, end: 20 };

/**
 * Calcula a faixa de horas a exibir: parte do padrão (8h–20h) e EXPANDE para
 * incluir qualquer atendimento mais cedo ou mais tarde — assim nada fica
 * cortado (ex.: atendimentos das 21h, comuns no estúdio).
 */
export function computeHourRange(
  appointments: { scheduled_start: string; scheduled_end: string }[],
  base: HourRange = DEFAULT_RANGE,
): HourRange {
  let start = base.start;
  let end = base.end;
  for (const a of appointments) {
    const s = new Date(a.scheduled_start);
    const e = new Date(a.scheduled_end);
    const sh = s.getHours();
    const eh = e.getHours() + (e.getMinutes() > 0 || e.getSeconds() > 0 ? 1 : 0);
    if (sh < start) start = sh;
    if (eh > end) end = eh;
  }
  start = Math.max(0, start);
  end = Math.min(24, end);
  if (end <= start) end = start + 1;
  return { start, end };
}

export function gridHeight(r: HourRange) {
  return (r.end - r.start) * HOUR_PX;
}

function offsetPx(min: number, r: HourRange) {
  return ((min - r.start * 60) / 60) * HOUR_PX;
}

export function TimeGutter({ range }: { range: HourRange }) {
  const hours = [];
  for (let h = range.start; h <= range.end; h++) hours.push(h);
  return (
    <div className="relative w-12 shrink-0" style={{ height: gridHeight(range) }}>
      {hours.map((h) => (
        <div
          key={h}
          className="absolute right-1 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
          style={{ top: offsetPx(h * 60, range) }}
        >
          {String(h).padStart(2, "0")}h
        </div>
      ))}
    </div>
  );
}

function HourLines({ range }: { range: HourRange }) {
  const lines = [];
  for (let h = range.start; h <= range.end; h++) {
    lines.push(
      <div
        key={h}
        className="absolute inset-x-0 border-t border-border/60"
        style={{ top: offsetPx(h * 60, range) }}
      />,
    );
  }
  return <>{lines}</>;
}

/**
 * Uma coluna do grid (um dia de uma profissional). Clicar num bloco abre os
 * detalhes; clicar no vazio cria um atendimento no horário aproximado.
 */
export function DayColumn({
  date,
  appointments,
  color,
  range,
  onSelect,
  onEmptyClick,
}: {
  date: Date;
  appointments: AppointmentRow[];
  color?: string;
  range: HourRange;
  onSelect: (a: AppointmentRow) => void;
  onEmptyClick?: (start: Date) => void;
}) {
  function handleBackgroundClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onEmptyClick) return;
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const min = range.start * 60 + (y / HOUR_PX) * 60;
    const snapped = Math.round(min / 15) * 15;
    const start = new Date(date);
    start.setHours(0, Math.max(range.start * 60, snapped), 0, 0);
    onEmptyClick(start);
  }

  return (
    <div
      className="relative flex-1 border-l"
      style={{ height: gridHeight(range) }}
      onClick={handleBackgroundClick}
    >
      <HourLines range={range} />
      {appointments.map((a) => {
        const startMin = minutesOfDay(new Date(a.scheduled_start));
        const endMin = minutesOfDay(new Date(a.scheduled_end));
        const top = Math.max(0, offsetPx(startMin, range));
        const height = Math.max(
          18,
          ((Math.min(endMin, range.end * 60) - startMin) / 60) * HOUR_PX - 2,
        );
        const meta = STATUS_META[a.status];
        return (
          <button
            key={a.id}
            onClick={() => onSelect(a)}
            className={`absolute inset-x-1 overflow-hidden rounded-lg px-2 py-1 text-left text-[11px] leading-tight shadow-sm ring-1 ring-black/5 ${meta.badge}`}
            style={{
              top,
              height,
              borderLeft: `3px solid ${color ?? "var(--primary)"}`,
            }}
            title={`${a.client_name_snapshot ?? ""} · ${a.service?.name ?? ""}`}
          >
            <span className="block font-medium truncate">
              {timeLabel(a.scheduled_start)} {a.client_name_snapshot ?? "—"}
            </span>
            <span className="block truncate opacity-80">{a.service?.name}</span>
          </button>
        );
      })}
    </div>
  );
}
