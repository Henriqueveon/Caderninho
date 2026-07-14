import {
  Activity,
  Calendar,
  Clock,
  Scissors,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { useActivityLog } from "@/hooks/useActivityLog";
import {
  type ActivityCategory,
  CATEGORY_LABEL,
  TONE_DOT,
  describeActivity,
} from "@/lib/activity";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORY_ICON: Record<ActivityCategory, LucideIcon> = {
  appointment: Calendar,
  service: Scissors,
  availability: Clock,
  goal: Target,
  other: Activity,
};

const FILTERS: { key: ActivityCategory | "all"; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "appointment", label: "Atendimentos" },
  { key: "service", label: "Serviços" },
  { key: "availability", label: "Horários" },
  { key: "goal", label: "Metas" },
];

function dayLabel(d: Date): string {
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "d 'de' MMMM", { locale: ptBR }).replace(/^\w/, (c) =>
    c.toUpperCase(),
  );
}

export function HistoryPage({ scope }: { scope: "all" | "self" }) {
  const log = useActivityLog();
  const [filter, setFilter] = useState<ActivityCategory | "all">("all");

  const groups = useMemo(() => {
    const rows = (log.data ?? [])
      .map((r) => ({ row: r, meta: describeActivity(r) }))
      .filter((x) => filter === "all" || x.meta.category === filter);

    const byDay = new Map<string, typeof rows>();
    for (const item of rows) {
      const key = format(new Date(item.row.created_at), "yyyy-MM-dd");
      const arr = byDay.get(key) ?? [];
      arr.push(item);
      byDay.set(key, arr);
    }
    return [...byDay.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [log.data, filter]);

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Histórico</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {scope === "self"
            ? "Suas ações no estúdio."
            : "Tudo o que acontece no estúdio, em ordem."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              filter === f.key
                ? "bg-[var(--primary-tint)] text-primary"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {log.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma ação registrada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([day, items]) => (
            <div key={day}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {dayLabel(new Date(`${day}T00:00:00`))}
              </h2>
              <Card>
                <CardContent className="flex flex-col divide-y divide-border p-0">
                  {items.map(({ row, meta }) => {
                    const Icon = CATEGORY_ICON[meta.category];
                    return (
                      <div key={row.id} className="flex items-center gap-3 p-4">
                        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span
                            className={cn(
                              "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
                              TONE_DOT[meta.tone],
                            )}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {meta.title}
                            {meta.detail && (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                · {meta.detail}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.actor?.full_name ?? "Sistema"} ·{" "}
                            {format(new Date(row.created_at), "HH:mm")}
                          </p>
                        </div>
                        <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">
                          {CATEGORY_LABEL[meta.category]}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
