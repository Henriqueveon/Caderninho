import type { AppointmentRow } from "@/hooks/useAgenda";
import {
  WEEKDAY_LABELS,
  dayNumber,
  isSameDay,
  isSameMonth,
  monthMatrix,
  timeLabel,
} from "@/lib/dates";
import { STATUS_META } from "./status";

/** Mês em grade; cada dia lista os atendimentos. Clicar no dia abre-o. */
export function MonthView({
  anchor,
  appointments,
  onSelectDay,
  onSelect,
}: {
  anchor: Date;
  appointments: AppointmentRow[];
  onSelectDay: (d: Date) => void;
  onSelect: (a: AppointmentRow) => void;
}) {
  const weeks = monthMatrix(anchor);
  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b">
          {WEEKDAY_LABELS.map((w) => (
            <div
              key={w}
              className="px-2 py-1.5 text-center text-[11px] font-medium uppercase text-muted-foreground"
            >
              {w}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0].toISOString()} className="grid grid-cols-7">
            {week.map((d) => {
              const dayAppts = appointments.filter((a) =>
                isSameDay(new Date(a.scheduled_start), d),
              );
              const dim = !isSameMonth(d, anchor);
              const isToday = isSameDay(d, today);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => onSelectDay(d)}
                  className={`flex min-h-[92px] flex-col gap-0.5 border-b border-l p-1.5 text-left last:border-r hover:bg-muted/50 ${
                    dim ? "bg-muted/20" : ""
                  }`}
                >
                  <span
                    className={`mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : dim
                          ? "text-muted-foreground"
                          : ""
                    }`}
                  >
                    {dayNumber(d)}
                  </span>
                  {dayAppts.slice(0, 3).map((a) => (
                    <span
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(a);
                      }}
                      className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${STATUS_META[a.status].badge}`}
                    >
                      {timeLabel(a.scheduled_start)} {a.client_name_snapshot}
                    </span>
                  ))}
                  {dayAppts.length > 3 && (
                    <span className="px-1 text-[10px] text-muted-foreground">
                      +{dayAppts.length - 3} mais
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
