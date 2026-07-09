import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Service } from "@/types/database";

/** Todos os serviços (incl. inativos) — a gestora lê tudo via RLS. */
export function useAllServices() {
  return useQuery({
    queryKey: ["services-admin"],
    queryFn: async (): Promise<Service[]> => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("active", { ascending: false })
        .order("name");
      if (error) throw error;
      return data as Service[];
    },
  });
}

export interface ServiceInput {
  id?: string;
  name: string;
  price: number;
  durationMinutes: number;
  commissionOverride: number | null;
  active: boolean;
}

export function useSaveService() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: ServiceInput) => {
      const payload = {
        name: input.name,
        price: input.price,
        duration_minutes: input.durationMinutes,
        commission_pct_override: input.commissionOverride,
        active: input.active,
      };
      if (input.id) {
        const { error } = await supabase
          .from("services")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("services")
          .insert({ ...payload, studio_id: profile!.studio_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services-admin"] });
      qc.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useRemoveService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string): Promise<string> => {
      const { data, error } = await supabase.rpc("remove_service", {
        p_service_id: serviceId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services-admin"] });
      qc.invalidateQueries({ queryKey: ["services"] });
    },
  });
}
