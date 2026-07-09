import { describe, expect, it } from "vitest";

import {
  averageCommissionTicket,
  computeEarning,
  computePotential,
  effectiveCommissionPct,
  sumProjectedCommission,
  sumRealizedCommission,
} from "./earnings";

describe("effectiveCommissionPct", () => {
  it("usa o override do serviço quando existe", () => {
    expect(effectiveCommissionPct(50, 60)).toBe(60);
  });

  it("cai no percentual base da profissional quando override é null", () => {
    expect(effectiveCommissionPct(50, null)).toBe(50);
  });
});

describe("computeEarning", () => {
  it("divide o valor entre profissional e estúdio", () => {
    expect(computeEarning(60, 50)).toEqual({
      gross: 60,
      commission: 30,
      studio: 30,
    });
  });

  it("arredonda para 2 casas e mantém a soma fechada", () => {
    const { gross, commission, studio } = computeEarning(35, 47.5);
    expect(commission).toBe(16.63); // 16.625 → 16.63
    expect(studio).toBe(18.37);
    expect(round(commission + studio)).toBe(gross);
  });
});

describe("sumProjectedCommission", () => {
  it("soma só scheduled e confirmed", () => {
    const total = sumProjectedCommission([
      { price_snapshot: 100, commission_pct_snapshot: 50, status: "scheduled" },
      { price_snapshot: 60, commission_pct_snapshot: 50, status: "confirmed" },
      { price_snapshot: 200, commission_pct_snapshot: 50, status: "canceled" },
      { price_snapshot: 200, commission_pct_snapshot: 50, status: "done" },
    ]);
    expect(total).toBe(80);
  });
});

describe("sumRealizedCommission", () => {
  it("soma os earnings do mês", () => {
    expect(
      sumRealizedCommission([
        { commission_value: 30 },
        { commission_value: 16.63 },
      ]),
    ).toBe(46.63);
  });
});

describe("averageCommissionTicket / computePotential", () => {
  it("ticket médio × slots livres", () => {
    const avg = averageCommissionTicket([
      { commission_value: 30 },
      { commission_value: 20 },
    ]);
    expect(avg).toBe(25);
    expect(computePotential(7, avg)).toBe(175);
  });

  it("sem histórico o ticket é zero", () => {
    expect(averageCommissionTicket([])).toBe(0);
  });
});

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
