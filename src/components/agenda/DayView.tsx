import type { AgendaProfessional, AppointmentRow } from "@/hooks/useAgenda";
import { isSameDay } from "@/lib/dates";
import { DayColumn, TimeGutter } from "./timegrid";

/** Dia com uma coluna por profissional (visão gestora/secretária). */
export function DayView({
  date,
  professionals,
  appointments,
  onSelect,
  onEmptyClick,
}: {
  date: Date;
  professionals: AgendaProfessional[];
  appointments: AppointmentRow[];
  onSelect: (a: AppointmentRow) => void;
  onEmptyClick?: (professionalId: string, start: Date) => void;
}) {
  const dayAppts = appointments.filter((a) =>
    isSameDay(new Date(a.scheduled_start), date),
  );

  if (professionals.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        Nenhuma profissional cadastrada ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        <div className="flex">
          <div className="w-12 shrink-0" />
          {professionals.map((p) => (
            <div
              key={p.id}
              className="flex-1 min-w-[140px] border-l px-2 py-2 text-center text-sm font-medium"
            >
              <span
                className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                style={{ backgroundColor: p.color }}
              />
              {p.full_name}
            </div>
          ))}
        </div>
        <div className="flex">
          <TimeGutter />
          {professionals.map((p) => (
            <div key={p.id} className="flex-1 min-w-[140px]">
              <DayColumn
                date={date}
                color={p.color}
                appointments={dayAppts.filter(
                  (a) => a.professional_id === p.id,
                )}
                onSelect={onSelect}
                onEmptyClick={
                  onEmptyClick ? (start) => onEmptyClick(p.id, start) : undefined
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
