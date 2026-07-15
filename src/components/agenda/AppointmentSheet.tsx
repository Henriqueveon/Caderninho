import { Ban, Check, Clock, Pencil, Play, Trash2, UserX } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  type AppointmentRow,
  useDeleteAppointment,
  useUpdateAppointment,
} from "@/hooks/useAgenda";
import { METHOD_LABEL } from "@/hooks/usePayments";
import { timeLabel } from "@/lib/dates";
import { computeEarning } from "@/lib/earnings";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { STATUS_META } from "./status";

function nowISO() {
  return new Date().toISOString();
}

const PAY_METHODS: PaymentMethod[] = ["pix", "cash", "debit", "credit"];

export function AppointmentSheet({
  appointment,
  open,
  onClose,
  onEdit,
}: {
  appointment: AppointmentRow | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (a: AppointmentRow) => void;
}) {
  const { profile } = useAuth();
  const update = useUpdateAppointment();
  const del = useDeleteAppointment();
  const [error, setError] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("pix");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    setPayMethod((appointment?.payment_method as PaymentMethod) ?? "pix");
  }, [open, appointment]);

  if (!appointment) return <Sheet open={open} onClose={onClose} title="" children={null} />;

  const role = profile?.role;
  const canManage = role === "owner" || role === "secretary";
  const canSeeFinance = role !== "secretary";
  const isDead =
    appointment.status === "canceled" || appointment.status === "no_show";
  // concluído pode ser editado (recalcula comissão); cancelado/faltou não
  const canEdit = (canManage || role === "professional") && !isDead;
  const canDelete = canManage; // qualquer status (a gestão remove via RPC)
  const canceledBy = role === "professional" ? "professional" : "owner";
  const meta = STATUS_META[appointment.status];
  const id = appointment.id;
  const earning = computeEarning(
    appointment.price_snapshot,
    appointment.commission_pct_snapshot,
  );

  async function patch(p: Parameters<typeof update.mutate>[0]) {
    setError(null);
    try {
      await update.mutateAsync(p);
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Não foi possível atualizar.");
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await del.mutateAsync(id);
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Não foi possível excluir.");
      setConfirmDelete(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={appointment.client_name_snapshot ?? "Atendimento"}
      description={appointment.service?.name ?? undefined}
    >
      <div className="flex flex-col gap-5">
        <span
          className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}
        >
          {meta.label}
        </span>

        <dl className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-foreground">
              {format(new Date(appointment.scheduled_start), "EEEE, d 'de' MMMM", {
                locale: ptBR,
              })}{" "}
              · {timeLabel(appointment.scheduled_start)}–
              {timeLabel(appointment.scheduled_end)}
            </span>
          </div>
          {canSeeFinance && (
            <>
              <div className="flex justify-between border-t pt-3">
                <span className="text-muted-foreground">Valor</span>
                <span className="tnums font-medium">
                  {formatBRL(appointment.price_snapshot)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Comissão ({appointment.commission_pct_snapshot}%)
                </span>
                <span className="tnums font-medium text-primary">
                  {formatBRL(earning.commission)}
                </span>
              </div>
            </>
          )}
          {appointment.status === "done" && appointment.payment_method && (
            <div className="flex justify-between border-t pt-3">
              <span className="text-muted-foreground">Forma de pagamento</span>
              <span className="font-medium">
                {METHOD_LABEL[appointment.payment_method]}
              </span>
            </div>
          )}
          {appointment.notes && (
            <div className="border-t pt-3">
              <span className="text-muted-foreground">Observações</span>
              <p className="mt-1">{appointment.notes}</p>
            </div>
          )}
        </dl>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Finalizar com a forma de pagamento da cliente */}
        {appointment.status === "in_progress" ? (
          <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
            <p className="text-sm font-medium">Como a cliente pagou?</p>
            <div className="flex flex-wrap gap-2">
              {PAY_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    payMethod === m
                      ? "bg-gradient-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {METHOD_LABEL[m]}
                </button>
              ))}
            </div>
            <Button
              onClick={() =>
                patch({
                  id,
                  status: "done",
                  actual_end: nowISO(),
                  payment_method: payMethod,
                })
              }
            >
              <Check className="h-4 w-4" /> Finalizar e registrar
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {appointment.status === "scheduled" && (
              <Button variant="secondary" onClick={() => patch({ id, status: "confirmed" })}>
                <Check className="h-4 w-4" /> Confirmar
              </Button>
            )}
            {(appointment.status === "scheduled" ||
              appointment.status === "confirmed") && (
              <>
                <Button
                  onClick={() => patch({ id, status: "in_progress", actual_start: nowISO() })}
                >
                  <Play className="h-4 w-4" /> Iniciar
                </Button>
                <Button variant="outline" onClick={() => patch({ id, status: "no_show" })}>
                  <UserX className="h-4 w-4" /> Faltou
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => patch({ id, status: "canceled", canceled_by: canceledBy })}
                >
                  <Ban className="h-4 w-4" /> Cancelar
                </Button>
              </>
            )}
          </div>
        )}

        {/* Editar / Excluir */}
        {(canEdit || canDelete) && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            {canEdit && onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(appointment)}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            )}
            {canDelete &&
              (confirmDelete ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={del.isPending}
                  >
                    {del.isPending ? "Excluindo…" : "Confirmar exclusão"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-destructive hover:bg-secondary"
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </button>
              ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
