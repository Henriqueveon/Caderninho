import type { AppointmentRow } from "@/hooks/useAgenda";
import { WEEKDAY_LABELS, dayNumber, daysOfWeek, isSameDay } from "@/lib/dates";
import { DayColumn, TimeGutter } from "./timegrid";

/** Semana de uma única profissional: 7 colunas de dia. */
export function WeekView({
  anchor,
  color,
  appointments,
  onSelect,
  onEmptyClick,
}: {
  anchor: Date;
  color?: string;
  appointments: AppointmentRow[];
  onSelect: (a: AppointmentRow) => void;
  onEmptyClick?: (start: Date) => void;
}) {
  const days = daysOfWeek(anchor);
  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="flex">
          <div className="w-12 shrink-0" />
          {days.map((d) => {
            const isToday = isSameDay(d, today);
            return (
              <div
                key={d.toISOString()}
                className="flex-1 border-l px-1 py-2 text-center"
              >
                <div className="text-[11px] uppercase text-muted-foreground">
                  {WEEKDAY_LABELS[d.getDay()]}
                </div>
                <div
                  className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                    isToday ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  {dayNumber(d)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex">
          <TimeGutter />
          {days.map((d) => (
            <div key={d.toISOString()} className="flex-1">
              <DayColumn
                date={d}
                color={color}
                appointments={appointments.filter((a) =>
                  isSameDay(new Date(a.scheduled_start), d),
                )}
                onSelect={onSelect}
                onEmptyClick={onEmptyClick}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
