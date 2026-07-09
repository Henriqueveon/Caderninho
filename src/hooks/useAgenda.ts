import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import type { DateRange } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { Appointment, AppointmentStatus, Service } from "@/types/database";

export interface AgendaProfessional {
  id: string;
  profile_id: string;
  full_name: string;
  color: string;
  bio: string | null;
}

export interface AppointmentRow extends Appointment {
  service: { name: string; duration_minutes: number } | null;
}

/** Serviços ativos do estúdio. */
export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async (): Promise<Service[]> => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Service[];
    },
  });
}

/** Profissionais agendáveis (via RPC — não expõe comissão). */
export function useProfessionals() {
  return useQuery({
    queryKey: ["professionals"],
    queryFn: async (): Promise<AgendaProfessional[]> => {
      const { data, error } = await supabase.rpc("get_bookable_professionals");
      if (error) throw error;
      return (data as AgendaProfessional[]) ?? [];
    },
  });
}

/** Linha de `professionals` da usuária logada (só faz sentido p/ role professional). */
export function useMyProfessional() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["my-professional", profile?.id],
    enabled: !!profile && profile.role === "professional",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, commission_pct, color")
        .eq("profile_id", profile!.id)
        .single();
      if (error) throw error;
      return data as { id: string; commission_pct: number; color: string };
    },
  });
}

/** Atendimentos num intervalo, opcionalmente filtrados por profissional. */
export function useAppointments(range: DateRange, professionalId?: string) {
  return useQuery({
    queryKey: [
      "appointments",
      range.start.toISOString(),
      range.end.toISOString(),
      professionalId ?? "all",
    ],
    queryFn: async (): Promise<AppointmentRow[]> => {
      let q = supabase
        .from("appointments")
        .select("*, service:service_id(name, duration_minutes)")
        .gte("scheduled_start", range.start.toISOString())
        .lt("scheduled_start", range.end.toISOString())
        .order("scheduled_start");
      if (professionalId) q = q.eq("professional_id", professionalId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as AppointmentRow[]) ?? [];
    },
  });
}

export interface BookInput {
  professionalId: string;
  serviceId: string;
  scheduledStart: Date;
  clientName?: string;
  clientId?: string;
  notes?: string;
}

export function useBookAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BookInput) => {
      const { data, error } = await supabase.rpc("book_appointment", {
        p_professional_id: input.professionalId,
        p_service_id: input.serviceId,
        p_scheduled_start: input.scheduledStart.toISOString(),
        p_client_id: input.clientId ?? null,
        p_client_name: input.clientName ?? null,
        p_notes: input.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export interface StatusPatch {
  id: string;
  status: AppointmentStatus;
  actual_start?: string | null;
  actual_end?: string | null;
  canceled_by?: "client" | "professional" | "owner";
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: StatusPatch) => {
      const { error } = await supabase
        .from("appointments")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["earnings"] });
    },
  });
}
