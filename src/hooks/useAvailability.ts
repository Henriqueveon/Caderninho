import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type {
  AvailabilityException,
  AvailabilityRule,
} from "@/types/database";

export function useAvailabilityRules(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["availability-rules", professionalId],
    enabled: !!professionalId,
    queryFn: async (): Promise<AvailabilityRule[]> => {
      const { data, error } = await supabase
        .from("availability_rules")
        .select("*")
        .eq("professional_id", professionalId!)
        .order("weekday")
        .order("start_time");
      if (error) throw error;
      return data as AvailabilityRule[];
    },
  });
}

export function useAvailabilityExceptions(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["availability-exceptions", professionalId],
    enabled: !!professionalId,
    queryFn: async (): Promise<AvailabilityException[]> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("availability_exceptions")
        .select("*")
        .eq("professional_id", professionalId!)
        .gte("date", today.toISOString().slice(0, 10))
        .order("date");
      if (error) throw error;
      return data as AvailabilityException[];
    },
  });
}

interface NewRule {
  studio_id: string;
  professional_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export function useSaveRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: NewRule) => {
      const { error } = await supabase.from("availability_rules").insert(rule);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["availability-rules"] }),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("availability_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["availability-rules"] }),
  });
}

interface NewException {
  studio_id: string;
  professional_id: string;
  date: string;
  type: "block" | "extra";
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export function useSaveException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (exc: NewException) => {
      const { error } = await supabase
        .from("availability_exceptions")
        .insert(exc);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["availability-exceptions"] }),
  });
}

export function useDeleteException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("availability_exceptions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["availability-exceptions"] }),
  });
}

/** studio_id do usuário logado, para escrever nas tabelas com filtro de tenant. */
export function useStudioId(): string | undefined {
  const { profile } = useAuth();
  return profile?.studio_id;
}
