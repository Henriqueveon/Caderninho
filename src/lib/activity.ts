import { formatBRL } from "@/lib/format";

export type ActivityCategory =
  | "appointment"
  | "service"
  | "availability"
  | "goal"
  | "other";

export type ActivityTone = "success" | "danger" | "warning" | "info";

export interface ActivityMeta {
  title: string;
  detail?: string;
  category: ActivityCategory;
  tone: ActivityTone;
}

interface RawLog {
  action: string;
  entity_type: string;
  metadata: Record<string, unknown> | null;
}

function num(v: unknown): number | null {
  return v == null ? null : Number(v);
}

/** Traduz uma linha do activity_log para algo legível. */
export function describeActivity(log: RawLog): ActivityMeta {
  const meta = (log.metadata ?? {}) as Record<string, unknown>;
  const nw = (meta.new ?? {}) as Record<string, unknown>;
  const old = (meta.old ?? {}) as Record<string, unknown>;
  const clientName = (nw.client_name_snapshot ?? old.client_name_snapshot) as
    | string
    | undefined;
  const serviceName = (nw.name ?? old.name) as string | undefined;

  switch (log.action) {
    case "appointment.done":
      return { title: "Atendimento concluído", detail: clientName, category: "appointment", tone: "success" };
    case "appointment.in_progress":
      return { title: "Atendimento iniciado", detail: clientName, category: "appointment", tone: "info" };
    case "appointment.confirmed":
      return { title: "Atendimento confirmado", detail: clientName, category: "appointment", tone: "info" };
    case "appointment.canceled":
      return { title: "Atendimento cancelado", detail: clientName, category: "appointment", tone: "danger" };
    case "appointment.no_show":
      return { title: "Cliente faltou", detail: clientName, category: "appointment", tone: "warning" };
    case "appointment.scheduled":
      return { title: "Atendimento reaberto", detail: clientName, category: "appointment", tone: "info" };
    case "appointments.insert":
      return { title: "Novo atendimento", detail: clientName, category: "appointment", tone: "info" };
    case "appointments.delete":
      return { title: "Atendimento removido", detail: clientName, category: "appointment", tone: "danger" };
    case "appointments.update":
      return { title: "Atendimento atualizado", detail: clientName, category: "appointment", tone: "info" };

    case "services.insert":
      return { title: "Serviço criado", detail: serviceName, category: "service", tone: "info" };
    case "services.update": {
      const op = num(old.price);
      const np = num(nw.price);
      const detail =
        op != null && np != null && op !== np
          ? `${serviceName}: ${formatBRL(op)} → ${formatBRL(np)}`
          : serviceName;
      return { title: "Serviço alterado", detail, category: "service", tone: "info" };
    }
    case "services.delete":
      return { title: "Serviço removido", detail: serviceName, category: "service", tone: "danger" };

    case "availability_rules.insert":
      return { title: "Horário recorrente adicionado", category: "availability", tone: "info" };
    case "availability_rules.delete":
      return { title: "Horário recorrente removido", category: "availability", tone: "danger" };
    case "availability_exceptions.insert":
      return { title: "Folga ou horário extra adicionado", category: "availability", tone: "info" };
    case "availability_exceptions.delete":
      return { title: "Folga ou horário extra removido", category: "availability", tone: "danger" };

    case "goals.insert":
      return { title: "Meta definida", category: "goal", tone: "info" };
    case "goals.update":
      return { title: "Meta alterada", category: "goal", tone: "info" };
    case "goals.delete":
      return { title: "Meta removida", category: "goal", tone: "danger" };

    default:
      return { title: log.action, category: "other", tone: "info" };
  }
}

export const TONE_DOT: Record<ActivityTone, string> = {
  success: "bg-success",
  danger: "bg-destructive",
  warning: "bg-warning",
  info: "bg-primary",
};

export const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  appointment: "Atendimentos",
  service: "Serviços",
  availability: "Horários",
  goal: "Metas",
  other: "Outros",
};
