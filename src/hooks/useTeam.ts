import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Invite, Role } from "@/types/database";

export interface TeamMember {
  professional_id: string;
  profile_id: string;
  full_name: string;
  phone: string | null;
  email: string;
  commission_pct: number;
  color: string;
  bio: string | null;
  active: boolean;
  created_at: string;
  service_ids: string[];
}

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase.rpc("get_team");
      if (error) throw error;
      return (data as TeamMember[]) ?? [];
    },
  });
}

export interface SaveProfessionalInput {
  professionalId: string;
  profileId: string;
  fullName: string;
  phone: string | null;
  commissionPct: number;
  color: string;
  bio: string | null;
  active: boolean;
  serviceIds: string[];
}

export function useSaveProfessional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveProfessionalInput) => {
      const p1 = await supabase
        .from("profiles")
        .update({ full_name: input.fullName, phone: input.phone })
        .eq("id", input.profileId);
      if (p1.error) throw p1.error;

      const p2 = await supabase
        .from("professionals")
        .update({
          commission_pct: input.commissionPct,
          color: input.color,
          bio: input.bio,
          active: input.active,
        })
        .eq("id", input.professionalId);
      if (p2.error) throw p2.error;

      // substitui o conjunto de serviços da profissional
      const del = await supabase
        .from("professional_services")
        .delete()
        .eq("professional_id", input.professionalId);
      if (del.error) throw del.error;

      if (input.serviceIds.length > 0) {
        const ins = await supabase.from("professional_services").insert(
          input.serviceIds.map((sid) => ({
            professional_id: input.professionalId,
            service_id: sid,
          })),
        );
        if (ins.error) throw ins.error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["professionals"] });
    },
  });
}

export function useInvites() {
  return useQuery({
    queryKey: ["invites"],
    queryFn: async (): Promise<Invite[]> => {
      const { data, error } = await supabase
        .from("invites")
        .select("*")
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invite[];
    },
  });
}

export interface CreateInviteInput {
  fullName: string;
  email: string;
  role: Extract<Role, "professional" | "secretary">;
  commissionPct: number;
}

export function useCreateInvite() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateInviteInput): Promise<string> => {
      const { data, error } = await supabase
        .from("invites")
        .insert({
          studio_id: profile!.studio_id,
          email: input.email,
          full_name: input.fullName,
          role: input.role,
          commission_pct: input.commissionPct,
          created_by: profile!.id,
        })
        .select("token")
        .single();
      if (error) throw error;
      return (data as { token: string }).token;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });
}
