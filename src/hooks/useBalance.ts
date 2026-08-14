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

interface BalanceRow {
  professional_id: string;
  commission: number;
  bonus: number;
  paid: number;
  saldo: number;
}

/**
 * Saldo ACUMULADO por profissional — de propósito sem recorte de período.
 * O relatório por período responde "quanto rendeu em agosto"; isto responde
 * "quanto ainda devo a ela", que é a pergunta do dia do pagamento e não pode
 * depender do filtro que estiver na tela.
 *
 * A soma é feita no Postgres (RPC get_balances), e não somando as linhas aqui:
 * o PostgREST devolve no máximo 1000 registros, então uma soma no navegador
 * começaria a errar dinheiro EM SILÊNCIO quando o estúdio passasse disso.
 * O próprio RPC escopa por papel — a gestora recebe a equipe, a profissional
 * só a si mesma, a secretária não recebe nada.
 */
export function useBalances() {
  return useQuery({
    queryKey: ["balances"],
    queryFn: async (): Promise<Map<string, Balance>> => {
      const { data, error } = await supabase.rpc("get_balances");
      if (error) throw error;
      const map = new Map<string, Balance>();
      for (const r of (data ?? []) as BalanceRow[]) {
        map.set(r.professional_id, {
          commission: Number(r.commission),
          bonus: Number(r.bonus),
          paid: Number(r.paid),
          saldo: Number(r.saldo),
        });
      }
      return map;
    },
    retry: false,
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
