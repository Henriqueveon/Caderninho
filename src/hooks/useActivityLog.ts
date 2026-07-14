import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export interface ActivityRow {
  id: string;
  action: string;
  entity_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string } | null;
}

/** Histórico de ações. RLS: owner vê o estúdio; profissional só as próprias. */
export function useActivityLog(limit = 150) {
  return useQuery({
    queryKey: ["activity-log", limit],
    queryFn: async (): Promise<ActivityRow[]> => {
      const { data, error } = await supabase
        .from("activity_log")
        .select(
          "id, action, entity_type, metadata, created_at, actor:actor_id(full_name)",
        )
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as unknown as ActivityRow[]) ?? [];
    },
  });
}
