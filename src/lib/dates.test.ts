import { describe, expect, it } from "vitest";

import {
  type InsightsSelection,
  insightsBuckets,
  insightsLabel,
  insightsRange,
  shiftInsights,
} from "./dates";

// Sexta-feira, 14 de agosto de 2026.
const SEXTA = new Date(2026, 7, 14, 15, 30);
const iso = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

describe("insightsRange", () => {
  it("semana cobre de segunda a sábado (domingo fica de fora)", () => {
    const { start, end } = insightsRange({ unit: "week", anchor: SEXTA });
    expect(iso(start)).toBe("2026-8-10"); // segunda
    expect(iso(end)).toBe("2026-8-16"); // domingo 00:00, exclusivo
  });

  it("mês vai do dia 1 ao primeiro dia do mês seguinte", () => {
    const { start, end } = insightsRange({ unit: "month", anchor: SEXTA });
    expect(iso(start)).toBe("2026-8-1");
    expect(iso(end)).toBe("2026-9-1");
  });

  it("trimestre e ano seguem o calendário", () => {
    expect(iso(insightsRange({ unit: "quarter", anchor: SEXTA }).start)).toBe("2026-7-1");
    expect(iso(insightsRange({ unit: "year", anchor: SEXTA }).start)).toBe("2026-1-1");
  });

  it("custom inclui o último dia inteiro", () => {
    const { start, end } = insightsRange({
      unit: "custom",
      anchor: SEXTA,
      start: new Date(2026, 7, 3),
      end: new Date(2026, 7, 9),
    });
    expect(iso(start)).toBe("2026-8-3");
    expect(iso(end)).toBe("2026-8-10"); // dia seguinte ao 9, exclusivo
  });

  it("custom com datas invertidas se ordena em vez de virar intervalo vazio", () => {
    const { start, end } = insightsRange({
      unit: "custom",
      anchor: SEXTA,
      start: new Date(2026, 7, 9),
      end: new Date(2026, 7, 3),
    });
    expect(iso(start)).toBe("2026-8-3");
    expect(iso(end)).toBe("2026-8-10");
  });
});

describe("shiftInsights", () => {
  it("volta uma semana útil", () => {
    const prev = shiftInsights({ unit: "week", anchor: SEXTA }, -1);
    expect(iso(insightsRange(prev).start)).toBe("2026-8-3");
  });

  it("volta um mês", () => {
    const prev = shiftInsights({ unit: "month", anchor: SEXTA }, -1);
    expect(iso(insightsRange(prev).start)).toBe("2026-7-1");
  });

  it("desliza a janela custom pelo próprio tamanho", () => {
    const sel: InsightsSelection = {
      unit: "custom",
      anchor: SEXTA,
      start: new Date(2026, 7, 10),
      end: new Date(2026, 7, 16), // 7 dias
    };
    const prev = insightsRange(shiftInsights(sel, -1));
    expect(iso(prev.start)).toBe("2026-8-3");
    expect(iso(prev.end)).toBe("2026-8-10");

    const next = insightsRange(shiftInsights(sel, 1));
    expect(iso(next.start)).toBe("2026-8-17");
  });
});

describe("insightsBuckets", () => {
  it("semana rende 6 colunas, de segunda a sábado", () => {
    const b = insightsBuckets({ unit: "week", anchor: SEXTA });
    expect(b).toHaveLength(6);
    expect(b.map((x) => x.label)).toEqual(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]);
  });

  it("mês rende uma coluna por dia", () => {
    expect(insightsBuckets({ unit: "month", anchor: SEXTA })).toHaveLength(31);
  });

  it("janelas longas agrupam por mês", () => {
    expect(insightsBuckets({ unit: "year", anchor: SEXTA })).toHaveLength(12);
    expect(insightsBuckets({ unit: "quarter", anchor: SEXTA })).toHaveLength(3);
  });

  it("os buckets cobrem o intervalo inteiro, sem furo nem sobreposição", () => {
    const sel: InsightsSelection = { unit: "month", anchor: SEXTA };
    const { start, end } = insightsRange(sel);
    const b = insightsBuckets(sel);
    expect(+b[0].start).toBe(+start);
    expect(+b[b.length - 1].end).toBe(+end);
    for (let i = 1; i < b.length; i++) expect(+b[i].start).toBe(+b[i - 1].end);
  });
});

describe("insightsLabel", () => {
  it("descreve cada recorte em português", () => {
    expect(insightsLabel({ unit: "week", anchor: SEXTA })).toBe("10–15 de agosto");
    expect(insightsLabel({ unit: "month", anchor: SEXTA })).toBe("Agosto de 2026");
    expect(insightsLabel({ unit: "year", anchor: SEXTA })).toBe("2026");
    expect(
      insightsLabel({
        unit: "custom",
        anchor: SEXTA,
        start: new Date(2026, 7, 3),
        end: new Date(2026, 7, 3),
      }),
    ).toBe("3 de agosto");
  });
});
