import type { AppointmentRow } from "@/hooks/useAgenda";
import { computeEarning } from "@/lib/earnings";
import { formatBRL } from "@/lib/format";

/** Números do período selecionado — "gerando dados para ela". */
export function PeriodStats({
  appointments,
  showRevenue,
}: {
  appointments: AppointmentRow[];
  showRevenue: boolean;
}) {
  const done = appointments.filter((a) => a.status === "done");
  const active = appointments.filter(
    (a) =>
      a.status === "scheduled" ||
      a.status === "confirmed" ||
      a.status === "in_progress",
  );
  const noShow = appointments.filter((a) => a.status === "no_show").length;
  const canceled = appointments.filter((a) => a.status === "canceled").length;

  const revenue = done.reduce((s, a) => s + a.price_snapshot, 0);
  const commission = done.reduce(
    (s, a) =>
      s + computeEarning(a.price_snapshot, a.commission_pct_snapshot).commission,
    0,
  );

  const items: { label: string; value: string; tone?: string }[] = [
    { label: "Agendados", value: String(active.length) },
    { label: "Concluídos", value: String(done.length), tone: "text-emerald-600" },
    { label: "Faltas", value: String(noShow), tone: "text-rose-600" },
    { label: "Cancelados", value: String(canceled), tone: "text-muted-foreground" },
  ];
  if (showRevenue) {
    items.push(
      { label: "Faturamento", value: formatBRL(revenue), tone: "text-foreground" },
      { label: "Comissões", value: formatBRL(commission), tone: "text-primary" },
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {it.label}
          </p>
          <p className={`tnums mt-0.5 text-lg font-semibold ${it.tone ?? ""}`}>
            {it.value}
          </p>
        </div>
      ))}
    </div>
  );
}
