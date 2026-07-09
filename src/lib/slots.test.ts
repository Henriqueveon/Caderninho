import { describe, expect, it } from "vitest";

import { generateSlots, timeToMinutes, toDateString } from "./slots";

// Quarta-feira, 15 de julho de 2026 (weekday 3)
const DATE = new Date(2026, 6, 15);
const at = (h: number, m = 0) => new Date(2026, 6, 15, h, m);

const RULE_9_TO_12 = { weekday: 3, start_time: "09:00", end_time: "12:00" };

describe("timeToMinutes", () => {
  it("converte HH:MM e HH:MM:SS", () => {
    expect(timeToMinutes("09:00")).toBe(540);
    expect(timeToMinutes("09:30:00")).toBe(570);
  });
});

describe("toDateString", () => {
  it("formata como coluna date do Postgres", () => {
    expect(toDateString(DATE)).toBe("2026-07-15");
  });
});

describe("generateSlots", () => {
  it("fatia a regra semanal em slots do tamanho do serviço", () => {
    const slots = generateSlots({
      date: DATE,
      rules: [RULE_9_TO_12],
      exceptions: [],
      busy: [],
      durationMinutes: 60,
      stepMinutes: 60,
    });
    expect(slots).toEqual([at(9), at(10), at(11)]);
  });

  it("último slot precisa caber inteiro no intervalo", () => {
    const slots = generateSlots({
      date: DATE,
      rules: [RULE_9_TO_12],
      exceptions: [],
      busy: [],
      durationMinutes: 90,
      stepMinutes: 30,
    });
    // 90min cabem começando às 9:00, 9:30 e 10:30 (10:30+90 = 12:00)
    expect(slots[slots.length - 1]).toEqual(at(10, 30));
    expect(slots).toHaveLength(4); // 9:00, 9:30, 10:00, 10:30
  });

  it("ignora regras de outros dias da semana", () => {
    const slots = generateSlots({
      date: DATE,
      rules: [{ weekday: 1, start_time: "09:00", end_time: "12:00" }],
      exceptions: [],
      busy: [],
      durationMinutes: 60,
    });
    expect(slots).toEqual([]);
  });

  it("subtrai atendimentos ocupados", () => {
    const slots = generateSlots({
      date: DATE,
      rules: [RULE_9_TO_12],
      exceptions: [],
      busy: [{ start: at(10), end: at(11) }],
      durationMinutes: 60,
      stepMinutes: 60,
    });
    expect(slots).toEqual([at(9), at(11)]);
  });

  it("bloqueio parcial remove os slots do período", () => {
    const slots = generateSlots({
      date: DATE,
      rules: [RULE_9_TO_12],
      exceptions: [
        {
          date: "2026-07-15",
          start_time: "09:00",
          end_time: "10:00",
          type: "block",
        },
      ],
      busy: [],
      durationMinutes: 60,
      stepMinutes: 60,
    });
    expect(slots).toEqual([at(10), at(11)]);
  });

  it("bloqueio sem horário é folga do dia inteiro", () => {
    const slots = generateSlots({
      date: DATE,
      rules: [RULE_9_TO_12],
      exceptions: [
        { date: "2026-07-15", start_time: null, end_time: null, type: "block" },
      ],
      busy: [],
      durationMinutes: 60,
    });
    expect(slots).toEqual([]);
  });

  it("exceção extra adiciona disponibilidade fora da regra", () => {
    const slots = generateSlots({
      date: DATE,
      rules: [],
      exceptions: [
        {
          date: "2026-07-15",
          start_time: "14:00",
          end_time: "16:00",
          type: "extra",
        },
      ],
      busy: [],
      durationMinutes: 60,
      stepMinutes: 60,
    });
    expect(slots).toEqual([at(14), at(15)]);
  });

  it("exceções de outras datas não afetam o dia", () => {
    const slots = generateSlots({
      date: DATE,
      rules: [RULE_9_TO_12],
      exceptions: [
        { date: "2026-07-16", start_time: null, end_time: null, type: "block" },
      ],
      busy: [],
      durationMinutes: 60,
      stepMinutes: 60,
    });
    expect(slots).toHaveLength(3);
  });

  it("remove slots no passado e que violem a antecedência mínima", () => {
    const slots = generateSlots({
      date: DATE,
      rules: [RULE_9_TO_12],
      exceptions: [],
      busy: [],
      durationMinutes: 60,
      stepMinutes: 60,
      now: at(8),
      minAdvanceHours: 2,
    });
    // agora 8h + 2h de antecedência → só a partir das 10h
    expect(slots).toEqual([at(10), at(11)]);
  });

  it("mescla regras sobrepostas sem duplicar slots", () => {
    const slots = generateSlots({
      date: DATE,
      rules: [
        RULE_9_TO_12,
        { weekday: 3, start_time: "11:00", end_time: "13:00" },
      ],
      exceptions: [],
      busy: [],
      durationMinutes: 60,
      stepMinutes: 60,
    });
    expect(slots).toEqual([at(9), at(10), at(11), at(12)]);
  });
});
