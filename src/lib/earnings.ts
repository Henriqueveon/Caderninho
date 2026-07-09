import type { Appointment, Earning } from "@/types/database";

export interface EarningBreakdown {
  gross: number;
  commission: number;
  studio: number;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Override do serviço vence; senão vale o percentual base da profissional. */
export function effectiveCommissionPct(
  professionalPct: number,
  serviceOverride: number | null,
): number {
  return serviceOverride ?? professionalPct;
}

/** Mesma fórmula do trigger create_earning_on_done (Seção 6.3). */
export function computeEarning(price: number, pct: number): EarningBreakdown {
  const commission = round2((price * pct) / 100);
  return {
    gross: round2(price),
    commission,
    studio: round2(price - commission),
  };
}

const PROJECTABLE_STATUSES = new Set(["scheduled", "confirmed"]);

/** "Já garantido": comissão projetada dos atendimentos futuros agendados. */
export function sumProjectedCommission(
  appointments: Pick<
    Appointment,
    "price_snapshot" | "commission_pct_snapshot" | "status"
  >[],
): number {
  return round2(
    appointments
      .filter((a) => PROJECTABLE_STATUSES.has(a.status))
      .reduce(
        (sum, a) =>
          sum + computeEarning(a.price_snapshot, a.commission_pct_snapshot).commission,
        0,
      ),
  );
}

/** "Ganho até agora no mês": soma dos earnings realizados. */
export function sumRealizedCommission(
  earnings: Pick<Earning, "commission_value">[],
): number {
  return round2(earnings.reduce((sum, e) => sum + e.commission_value, 0));
}

/**
 * "Potencial máximo": slots livres restantes no mês × ticket médio de comissão.
 * O ticket médio vem dos últimos 60 dias; sem histórico, usar a média das
 * comissões dos serviços que a profissional executa.
 */
export function computePotential(
  freeSlotCount: number,
  avgCommissionTicket: number,
): number {
  return round2(freeSlotCount * avgCommissionTicket);
}

export function averageCommissionTicket(
  earnings: Pick<Earning, "commission_value">[],
): number {
  if (earnings.length === 0) return 0;
  return round2(sumRealizedCommission(earnings) / earnings.length);
}
