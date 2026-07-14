import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Studio, StudioSettings } from "@/types/database";

export function useStudio() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["studio", profile?.studio_id],
    enabled: !!profile?.studio_id,
    queryFn: async (): Promise<Studio> => {
      const { data, error } = await supabase
        .from("studios")
        .select("*")
        .eq("id", profile!.studio_id)
        .single();
      if (error) throw error;
      return data as Studio;
    },
  });
}

export interface StudioInput {
  name: string;
  phone: string | null;
  address: string | null;
  settings: StudioSettings;
}

export function useSaveStudio() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: StudioInput) => {
      const { error } = await supabase
        .from("studios")
        .update({
          name: input.name,
          phone: input.phone,
          address: input.address,
          settings: input.settings,
        })
        .eq("id", profile!.studio_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["studio"] }),
  });
}
