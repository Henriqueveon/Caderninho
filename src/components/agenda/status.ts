import type { AppointmentStatus } from "@/types/database";

export interface StatusMeta {
  label: string;
  /** Cor de fundo/texto para badges e blocos. */
  badge: string;
  dot: string;
}

export const STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  scheduled: {
    label: "Agendado",
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
  },
  confirmed: {
    label: "Confirmado",
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
  },
  in_progress: {
    label: "Em atendimento",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
  done: {
    label: "Concluído",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  no_show: {
    label: "Faltou",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },
  canceled: {
    label: "Cancelado",
    badge: "bg-gray-100 text-gray-500 line-through",
    dot: "bg-gray-400",
  },
};

/** Considera o horário como ocupando a agenda (para ocupação/slots). */
export const ACTIVE_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "in_progress",
];
