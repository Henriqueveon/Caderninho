import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Goal } from "@/types/database";

/** "YYYY-MM-01" do mês de uma data (coluna month das metas). */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function useGoals(month: Date) {
  const key = monthKey(month);
  return useQuery({
    queryKey: ["goals", key],
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("month", key);
      if (error) throw error;
      return data as Goal[];
    },
  });
}

export interface GoalInput {
  professionalIds: string[]; // 1 ou vários (equipe toda)
  month: string; // YYYY-MM-01
  targetType: "revenue" | "appointments";
  targetValue: number;
  bonusType: "fixed" | "extra_pct";
  bonusValue: number;
}

export function useSaveGoals() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: GoalInput) => {
      const rows = input.professionalIds.map((pid) => ({
        studio_id: profile!.studio_id,
        professional_id: pid,
        month: input.month,
        target_type: input.targetType,
        target_value: input.targetValue,
        bonus_type: input.bonusType,
        bonus_value: input.bonusValue,
      }));
      // unique (professional_id, month, target_type): sobrescreve se já existir
      const { error } = await supabase
        .from("goals")
        .upsert(rows, { onConflict: "professional_id,month,target_type" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}
