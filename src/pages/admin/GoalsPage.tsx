import { ChevronLeft, ChevronRight, Plus, Target, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { GoalSheet } from "@/components/goals/GoalSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProfessionals } from "@/hooks/useAgenda";
import { useEarnings } from "@/hooks/useFinance";
import { useDeleteGoal, useGoals } from "@/hooks/useGoals";
import { periodLabel, periodRange, shiftPeriod } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import type { Goal } from "@/types/database";

interface ProgressStat {
  gross: number;
  count: number;
}

function goalProgress(goal: Goal, stat: ProgressStat | undefined) {
  const realized =
    goal.target_type === "revenue" ? (stat?.gross ?? 0) : (stat?.count ?? 0);
  const pct = goal.target_value > 0 ? realized / goal.target_value : 0;
  return { realized, pct: Math.min(1, pct), hit: realized >= goal.target_value };
}

export function GoalsPage() {
  const [month, setMonth] = useState(() => new Date());
  const [open, setOpen] = useState(false);

  const professionals = useProfessionals();
  const goals = useGoals(month);
  const deleteGoal = useDeleteGoal();

  const monthRange = useMemo(() => periodRange(month, "month"), [month]);
  const earnings = useEarnings(monthRange);

  // realizado por profissional no mês
  const stats = new Map<string, ProgressStat>();
  for (const e of earnings.data ?? []) {
    const cur = stats.get(e.professional_id) ?? { gross: 0, count: 0 };
    cur.gross += Number(e.gross_value);
    cur.count += 1;
    stats.set(e.professional_id, cur);
  }

  const nameOf = (id: string) =>
    professionals.data?.find((p) => p.id === id)?.full_name ?? "—";
  const colorOf = (id: string) =>
    professionals.data?.find((p) => p.id === id)?.color ?? "#8B5CF6";

  const rows = (goals.data ?? []).sort((a, b) =>
    nameOf(a.professional_id).localeCompare(nameOf(b.professional_id)),
  );

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Metas e bônus</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina metas por profissional ou para a equipe toda.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar meta
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" aria-label="Mês anterior"
          onClick={() => setMonth((m) => shiftPeriod(m, "month", -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>
          Mês atual
        </Button>
        <Button variant="outline" size="icon" aria-label="Próximo mês"
          onClick={() => setMonth((m) => shiftPeriod(m, "month", 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="ml-2 text-sm font-medium capitalize text-muted-foreground">
          {periodLabel(month, "month")}
        </span>
      </div>

      {goals.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando metas…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Target className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma meta para este mês. Clique em “Adicionar meta”.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((g) => {
            const { realized, pct, hit } = goalProgress(
              g,
              stats.get(g.professional_id),
            );
            const target =
              g.target_type === "revenue"
                ? formatBRL(g.target_value)
                : `${g.target_value} atend.`;
            const realizedLabel =
              g.target_type === "revenue"
                ? formatBRL(realized)
                : `${realized} atend.`;
            const bonusLabel =
              g.bonus_type === "fixed"
                ? formatBRL(g.bonus_value)
                : `+${g.bonus_value}%`;
            return (
              <Card key={g.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: colorOf(g.professional_id) }}
                      />
                      <span className="font-medium">
                        {nameOf(g.professional_id)}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {g.target_type === "revenue"
                          ? "Faturamento"
                          : "Atendimentos"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        Bônus{" "}
                        <span className="font-medium text-primary">
                          {bonusLabel}
                        </span>
                      </span>
                      <button
                        aria-label="Remover meta"
                        onClick={() => deleteGoal.mutate(g.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="tnums">
                        {realizedLabel}{" "}
                        <span className="text-muted-foreground">
                          de {target}
                        </span>
                      </span>
                      <span
                        className={`text-xs font-medium ${hit ? "text-emerald-600" : "text-muted-foreground"}`}
                      >
                        {hit ? "Meta batida! 🎉" : `${Math.round(pct * 100)}%`}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${hit ? "bg-emerald-500" : "bg-primary"}`}
                        style={{ width: `${pct * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GoalSheet
        open={open}
        onClose={() => setOpen(false)}
        professionals={professionals.data ?? []}
        month={month}
      />
    </section>
  );
}
