import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import type { DateRange } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { Payment, PaymentKind, PaymentMethod } from "@/types/database";

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Lançamentos num intervalo. RLS: owner vê tudo; profissional só os seus. */
export function usePayments(range: DateRange, professionalId?: string) {
  return useQuery({
    queryKey: [
      "payments",
      dateStr(range.start),
      dateStr(range.end),
      professionalId ?? "all",
    ],
    queryFn: async (): Promise<Payment[]> => {
      let q = supabase
        .from("payments")
        .select("*")
        .gte("paid_at", dateStr(range.start))
        .lt("paid_at", dateStr(range.end))
        .order("paid_at", { ascending: false });
      if (professionalId) q = q.eq("professional_id", professionalId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Payment[];
    },
    retry: false, // se a tabela ainda não existir, não fica repetindo
  });
}

export interface PaymentInput {
  id?: string;
  professionalId: string;
  kind: PaymentKind;
  method: PaymentMethod | null;
  amount: number;
  paidAt: string; // YYYY-MM-DD
  notes: string | null;
}

export function useSavePayment() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: PaymentInput) => {
      const payload = {
        professional_id: input.professionalId,
        kind: input.kind,
        method: input.method,
        amount: input.amount,
        paid_at: input.paidAt,
        notes: input.notes,
      };
      if (input.id) {
        const { error } = await supabase
          .from("payments")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payments").insert({
          ...payload,
          studio_id: profile!.studio_id,
          created_by: profile!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
  other: "Outro",
};

export const KIND_LABEL: Record<PaymentKind, string> = {
  payment: "Pagamento",
  advance: "Vale",
};
