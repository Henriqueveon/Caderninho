import { Clock, Play, Check, X, UserX, Ban } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateAppointment } from "@/hooks/useAgenda";
import type { AppointmentRow } from "@/hooks/useAgenda";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { computeEarning } from "@/lib/earnings";
import { formatBRL } from "@/lib/format";
import { timeLabel } from "@/lib/dates";
import { STATUS_META } from "./status";

function nowISO() {
  return new Date().toISOString();
}

export function AppointmentSheet({
  appointment,
  open,
  onClose,
}: {
  appointment: AppointmentRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const update = useUpdateAppointment();
  const [error, setError] = useState<string | null>(null);

  if (!appointment) return <Sheet open={open} onClose={onClose} title="" children={null} />;

  const canceledBy =
    profile?.role === "professional" ? "professional" : "owner";
  const canSeeFinance = profile?.role !== "secretary";
  const meta = STATUS_META[appointment.status];

  async function patch(patch: Parameters<typeof update.mutate>[0]) {
    setError(null);
    try {
      await update.mutateAsync(patch);
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Não foi possível atualizar.");
    }
  }

  const id = appointment.id;
  const earning = computeEarning(
    appointment.price_snapshot,
    appointment.commission_pct_snapshot,
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={appointment.client_name_snapshot ?? "Atendimento"}
      description={appointment.service?.name ?? undefined}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}
          >
            {meta.label}
          </span>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-foreground">
              {format(new Date(appointment.scheduled_start), "EEEE, d 'de' MMMM", {
                locale: ptBR,
              })}
              {" · "}
              {timeLabel(appointment.scheduled_start)}–
              {timeLabel(appointment.scheduled_end)}
            </span>
          </div>
          {canSeeFinance && (
            <div className="flex justify-between border-t pt-3">
              <span className="text-muted-foreground">Valor</span>
              <span className="tnums font-medium">
                {formatBRL(appointment.price_snapshot)}
              </span>
            </div>
          )}
          {canSeeFinance && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Comissão ({appointment.commission_pct_snapshot}%)
              </span>
              <span className="tnums font-medium text-primary">
                {formatBRL(earning.commission)}
              </span>
            </div>
          )}
          {appointment.notes && (
            <div className="border-t pt-3">
              <span className="text-muted-foreground">Observações</span>
              <p className="mt-1">{appointment.notes}</p>
            </div>
          )}
          {appointment.actual_start && appointment.actual_end && (
            <div className="flex justify-between border-t pt-3">
              <span className="text-muted-foreground">Duração real</span>
              <span className="tnums">
                {Math.round(
                  (new Date(appointment.actual_end).getTime() -
                    new Date(appointment.actual_start).getTime()) /
                    60000,
                )}{" "}
                min
              </span>
            </div>
          )}
        </dl>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {appointment.status === "scheduled" && (
            <Button
              variant="secondary"
              onClick={() => patch({ id, status: "confirmed" })}
            >
              <Check className="h-4 w-4" /> Confirmar
            </Button>
          )}
          {(appointment.status === "scheduled" ||
            appointment.status === "confirmed") && (
            <>
              <Button
                onClick={() =>
                  patch({ id, status: "in_progress", actual_start: nowISO() })
                }
              >
                <Play className="h-4 w-4" /> Iniciar
              </Button>
              <Button
                variant="outline"
                onClick={() => patch({ id, status: "no_show" })}
              >
                <UserX className="h-4 w-4" /> Faltou
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  patch({ id, status: "canceled", canceled_by: canceledBy })
                }
              >
                <Ban className="h-4 w-4" /> Cancelar
              </Button>
            </>
          )}
          {appointment.status === "in_progress" && (
            <Button
              onClick={() => patch({ id, status: "done", actual_end: nowISO() })}
            >
              <Check className="h-4 w-4" /> Finalizar
            </Button>
          )}
          {(appointment.status === "done" ||
            appointment.status === "no_show" ||
            appointment.status === "canceled") && (
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" /> Fechar
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
