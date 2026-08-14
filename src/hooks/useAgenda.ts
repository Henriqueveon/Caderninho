import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import type { DateRange } from "@/lib/dates";
import { fetchPaged } from "@/lib/paged";
import { supabase } from "@/lib/supabase";
import type { Appointment, AppointmentStatus, Service } from "@/types/database";

export interface AgendaProfessional {
  id: string;
  profile_id: string;
  full_name: string;
  color: string;
  bio: string | null;
}

export interface AppointmentItem {
  service_id: string | null;
  name_snapshot: string;
  price: number;
  duration_minutes: number;
}

export interface AppointmentRow extends Appointment {
  service: { name: string; duration_minutes: number } | null;
  items: AppointmentItem[] | null;
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
    // Paginado: um recorte de ano passa das 1000 linhas que o PostgREST
    // devolve, e uma lista cortada em silêncio vira estatística errada.
    queryFn: (): Promise<AppointmentRow[]> =>
      fetchPaged<AppointmentRow>((from, to) => {
        let q = supabase
          .from("appointments")
          .select(
            "*, service:service_id(name, duration_minutes), items:appointment_items(service_id, name_snapshot, price, duration_minutes)",
          )
          .gte("scheduled_start", range.start.toISOString())
          .lt("scheduled_start", range.end.toISOString())
          .order("scheduled_start")
          .range(from, to);
        if (professionalId) q = q.eq("professional_id", professionalId);
        return q as unknown as PromiseLike<{
          data: AppointmentRow[] | null;
          error: { message: string } | null;
        }>;
      }),
  });
}

export interface BookInput {
  professionalId: string;
  serviceIds: string[];
  scheduledStart: Date;
  clientName?: string;
  clientId?: string;
  clientRecordId?: string;
  notes?: string;
}

export function useBookAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BookInput) => {
      const { data, error } = await supabase.rpc("book_appointment", {
        p_professional_id: input.professionalId,
        p_service_id: input.serviceIds[0],
        p_service_ids: input.serviceIds,
        p_scheduled_start: input.scheduledStart.toISOString(),
        p_client_id: input.clientId ?? null,
        p_client_name: input.clientName ?? null,
        p_notes: input.notes ?? null,
        p_client_record_id: input.clientRecordId ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export interface StatusPatch {
  id: string;
  status?: AppointmentStatus;
  actual_start?: string | null;
  actual_end?: string | null;
  payment_method?: string | null;
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

export interface EditInput {
  id: string;
  professionalId: string;
  serviceIds: string[];
  scheduledStart: Date;
  clientRecordId?: string;
  clientName?: string;
  notes?: string;
  paymentMethod?: string | null;
}

export function useEditAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EditInput) => {
      const { error } = await supabase.rpc("edit_appointment", {
        p_id: input.id,
        p_professional_id: input.professionalId,
        p_service_id: input.serviceIds[0],
        p_service_ids: input.serviceIds,
        p_scheduled_start: input.scheduledStart.toISOString(),
        p_client_record_id: input.clientRecordId ?? null,
        p_client_name: input.clientName ?? null,
        p_notes: input.notes ?? null,
        p_payment_method: input.paymentMethod ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["earnings"] });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_appointment", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["earnings"] });
    },
  });
}
