import { minutesOfDay, timeLabel } from "@/lib/dates";
import type { AppointmentRow } from "@/hooks/useAgenda";
import { STATUS_META } from "./status";

export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 20;
export const HOUR_PX = 56;
const TOTAL_MIN = (DAY_END_HOUR - DAY_START_HOUR) * 60;

export function gridHeight() {
  return (DAY_END_HOUR - DAY_START_HOUR) * HOUR_PX;
}

function offsetPx(min: number) {
  return ((min - DAY_START_HOUR * 60) / 60) * HOUR_PX;
}

export function TimeGutter() {
  const hours = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) hours.push(h);
  return (
    <div className="relative w-12 shrink-0" style={{ height: gridHeight() }}>
      {hours.map((h) => (
        <div
          key={h}
          className="absolute right-1 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
          style={{ top: offsetPx(h * 60) }}
        >
          {String(h).padStart(2, "0")}h
        </div>
      ))}
    </div>
  );
}

function HourLines() {
  const lines = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
    lines.push(
      <div
        key={h}
        className="absolute inset-x-0 border-t border-border/60"
        style={{ top: offsetPx(h * 60) }}
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
  onSelect,
  onEmptyClick,
}: {
  date: Date;
  appointments: AppointmentRow[];
  color?: string;
  onSelect: (a: AppointmentRow) => void;
  onEmptyClick?: (start: Date) => void;
}) {
  function handleBackgroundClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onEmptyClick) return;
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const min = DAY_START_HOUR * 60 + (y / HOUR_PX) * 60;
    const snapped = Math.round(min / 15) * 15;
    const start = new Date(date);
    start.setHours(0, Math.max(DAY_START_HOUR * 60, snapped), 0, 0);
    onEmptyClick(start);
  }

  return (
    <div
      className="relative flex-1 border-l"
      style={{ height: gridHeight() }}
      onClick={handleBackgroundClick}
    >
      <HourLines />
      {appointments.map((a) => {
        const startMin = minutesOfDay(new Date(a.scheduled_start));
        const endMin = minutesOfDay(new Date(a.scheduled_end));
        const top = Math.max(0, offsetPx(startMin));
        const height = Math.max(
          18,
          ((Math.min(endMin, DAY_END_HOUR * 60) - startMin) / 60) * HOUR_PX - 2,
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
              borderLeft: `3px solid ${color ?? "#8B5CF6"}`,
            }}
            title={`${a.client_name_snapshot ?? ""} · ${a.service?.name ?? ""}`}
          >
            <span className="block font-medium truncate">
              {timeLabel(a.scheduled_start)} {a.client_name_snapshot ?? "—"}
            </span>
            <span className="block truncate opacity-80">
              {a.service?.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { TOTAL_MIN };
