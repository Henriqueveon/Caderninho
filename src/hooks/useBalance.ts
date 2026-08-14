import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export interface Balance {
  /** Comissões de todos os atendimentos concluídos, desde sempre. */
  commission: number;
  /** Bônus de metas batidas, desde sempre. */
  bonus: number;
  /** Pagamentos e vales já entregues, desde sempre. */
  paid: number;
  /** O que ainda falta receber (positivo) ou o que foi adiantado (negativo). */
  saldo: number;
}

const zero: Balance = { commission: 0, bonus: 0, paid: 0, saldo: 0 };

/**
 * Saldo ACUMULADO por profissional — de propósito sem recorte de período.
 * O relatório por período responde "quanto rendeu em agosto"; isto responde
 * "quanto ainda devo a ela", que é a pergunta do dia do pagamento e não pode
 * depender do filtro que estiver na tela.
 *
 * A RLS já escopa: a gestora recebe a equipe inteira, a profissional só a si.
 */
export function useBalances() {
  return useQuery({
    queryKey: ["balances"],
    queryFn: async (): Promise<Map<string, Balance>> => {
      const [earnings, bonuses, payments] = await Promise.all([
        supabase.from("earnings").select("professional_id, commission_value"),
        supabase.from("bonuses").select("professional_id, value"),
        supabase.from("payments").select("professional_id, amount"),
      ]);
      if (earnings.error) throw earnings.error;

      const map = new Map<string, Balance>();
      const add = (id: string, field: keyof Balance, value: number) => {
        const cur = map.get(id) ?? { ...zero };
        map.set(id, { ...cur, [field]: cur[field] + value });
      };

      for (const e of earnings.data ?? []) {
        add(e.professional_id, "commission", Number(e.commission_value));
      }
      // Bônus e pagamentos podem estar bloqueados por RLS (secretária) ou a
      // tabela ainda não existir — nesse caso o saldo vale só a comissão.
      if (!bonuses.error) {
        for (const b of bonuses.data ?? []) {
          add(b.professional_id, "bonus", Number(b.value));
        }
      }
      if (!payments.error) {
        for (const p of payments.data ?? []) {
          add(p.professional_id, "paid", Number(p.amount));
        }
      }

      for (const [id, b] of map) {
        map.set(id, { ...b, saldo: b.commission + b.bonus - b.paid });
      }
      return map;
    },
  });
}

/** Saldo acumulado de uma profissional só. */
export function useMyBalance(professionalId?: string) {
  const all = useBalances();
  return {
    ...all,
    data: professionalId ? (all.data?.get(professionalId) ?? zero) : undefined,
  };
}
