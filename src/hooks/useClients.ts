import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { AppointmentStatus } from "@/types/database";

export interface ClientStat {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  total: number;
  done: number;
  no_show: number;
  canceled: number;
  upcoming: number;
  last_visit: string | null;
}

/** Taxa de presença = comparecimentos / (comparecimentos + faltas). */
export function attendanceRate(c: {
  done: number;
  no_show: number;
}): number | null {
  const base = c.done + c.no_show;
  return base === 0 ? null : c.done / base;
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async (): Promise<ClientStat[]> => {
      const { data, error } = await supabase.rpc("get_clients_with_stats");
      if (error) throw error;
      return (data as ClientStat[]) ?? [];
    },
  });
}

/** Lista leve para o seletor de cliente no agendamento (staff lê via RLS). */
export function useClientOptions() {
  return useQuery({
    queryKey: ["client-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, phone")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string; phone: string | null }[];
    },
  });
}

export interface ClientHistoryRow {
  id: string;
  scheduled_start: string;
  status: AppointmentStatus;
  price_snapshot: number;
  professional_id: string;
  service: { name: string } | null;
}

export function useClientHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-history", clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<ClientHistoryRow[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, scheduled_start, status, price_snapshot, professional_id, service:service_id(name)",
        )
        .eq("client_record_id", clientId!)
        .order("scheduled_start", { ascending: false });
      if (error) throw error;
      return (data as unknown as ClientHistoryRow[]) ?? [];
    },
  });
}

export interface ClientInput {
  id?: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export function useSaveClient() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: ClientInput) => {
      const payload = {
        full_name: input.fullName,
        phone: input.phone,
        email: input.email,
        notes: input.notes,
      };
      if (input.id) {
        const { error } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clients")
          .insert({ ...payload, studio_id: profile!.studio_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client-options"] });
    },
  });
}

export function useRemoveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // FK on delete set null: atendimentos passados mantêm o nome (snapshot)
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client-options"] });
    },
  });
}
