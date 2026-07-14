import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { monthKey } from "@/hooks/useGoals";
import { periodRange } from "@/lib/dates";
import { round2 } from "@/lib/earnings";
import { supabase } from "@/lib/supabase";
import type { Bonus, Goal } from "@/types/database";

export function useBonuses(month: Date) {
  const key = monthKey(month);
  return useQuery({
    queryKey: ["bonuses", key],
    queryFn: async (): Promise<Bonus[]> => {
      const { data, error } = await supabase
        .from("bonuses")
        .select("*")
        .eq("month", key);
      if (error) throw error;
      return data as Bonus[];
    },
  });
}

export interface CloseMonthResult {
  generated: number;
  total: number;
  alreadyClosed: boolean;
}

/**
 * Fecha o mês: para cada meta batida que ainda não gerou bônus, cria o
 * lançamento em `bonuses`. Idempotente (não duplica). Regra do bônus:
 * fixo = valor; extra_pct = % sobre o bruto gerado pela profissional no mês.
 */
export function useCloseMonth() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (month: Date): Promise<CloseMonthResult> => {
      const key = monthKey(month);
      const range = periodRange(month, "month");

      const [{ data: goals }, { data: earnings }, { data: existing }] =
        await Promise.all([
          supabase.from("goals").select("*").eq("month", key),
          supabase
            .from("earnings")
            .select("professional_id, gross_value")
            .gte("earned_at", range.start.toISOString())
            .lt("earned_at", range.end.toISOString()),
          supabase.from("bonuses").select("goal_id").eq("month", key),
        ]);

      const byPro = new Map<string, { gross: number; count: number }>();
      for (const e of earnings ?? []) {
        const cur = byPro.get(e.professional_id) ?? { gross: 0, count: 0 };
        cur.gross += Number(e.gross_value);
        cur.count += 1;
        byPro.set(e.professional_id, cur);
      }

      const doneGoalIds = new Set(
        (existing ?? []).map((b) => b.goal_id as string),
      );

      const rows: Omit<Bonus, "id" | "created_at" | "status">[] = [];
      for (const g of (goals ?? []) as Goal[]) {
        if (doneGoalIds.has(g.id)) continue;
        const stat = byPro.get(g.professional_id) ?? { gross: 0, count: 0 };
        const realized = g.target_type === "revenue" ? stat.gross : stat.count;
        if (realized < g.target_value) continue;
        const value =
          g.bonus_type === "fixed"
            ? g.bonus_value
            : round2((g.bonus_value / 100) * stat.gross);
        rows.push({
          studio_id: profile!.studio_id,
          professional_id: g.professional_id,
          goal_id: g.id,
          month: key,
          value,
        });
      }

      if (rows.length === 0) {
        return {
          generated: 0,
          total: 0,
          alreadyClosed: doneGoalIds.size > 0,
        };
      }

      const { error } = await supabase
        .from("bonuses")
        .insert(rows.map((r) => ({ ...r, status: "pending" })));
      if (error) throw error;

      return {
        generated: rows.length,
        total: round2(rows.reduce((s, r) => s + r.value, 0)),
        alreadyClosed: false,
      };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bonuses"] }),
  });
}

export function useMarkBonusPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase
        .from("bonuses")
        .update({ status: paid ? "paid" : "pending" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bonuses"] }),
  });
}
