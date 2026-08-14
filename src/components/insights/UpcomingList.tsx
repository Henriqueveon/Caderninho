import type { AppointmentRow } from "@/hooks/useAgenda";
import { relativeTime, timeLabel } from "@/lib/dates";

/** Próximos atendimentos como linhas de agenda: hora serifada, traço da cor da
 *  profissional, serviço em itálico, e o tempo relativo à direita. */
export function UpcomingList({
  appointments,
  color,
}: {
  appointments: AppointmentRow[];
  color?: (professionalId: string) => string;
}) {
  if (appointments.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum atendimento à frente — que tal preencher a agenda?
      </p>
    );
  }
  return (
    <ul className="divide-y divide-rule">
      {appointments.map((a) => {
        const soon = new Date(a.scheduled_start).getTime() - Date.now() < 60 * 60 * 1000;
        return (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <span className="figure w-11 shrink-0 text-right text-sm text-muted-foreground">
              {timeLabel(a.scheduled_start)}
            </span>
            <span
              className="h-8 w-[2px] shrink-0 rounded-full"
              style={{ backgroundColor: color?.(a.professional_id) ?? "var(--primary)" }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {a.client_name_snapshot ?? "—"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {a.service?.name}
                {(a.items?.length ?? 0) > 1 ? ` +${a.items!.length - 1}` : ""}
              </p>
            </div>
            <span
              className={`shrink-0 text-[11px] font-medium ${
                soon ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {relativeTime(a.scheduled_start)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
