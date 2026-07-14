import { format } from "date-fns";

import type { EarningRow } from "@/hooks/useFinance";

export interface ProfessionalTotals {
  professionalId: string;
  name: string;
  color: string;
  count: number;
  gross: number;
  commission: number;
  studio: number;
}

export interface Totals {
  count: number;
  gross: number;
  commission: number;
  studio: number;
}

export function sumTotals(earnings: EarningRow[]): Totals {
  return earnings.reduce(
    (acc, e) => ({
      count: acc.count + 1,
      gross: acc.gross + Number(e.gross_value),
      commission: acc.commission + Number(e.commission_value),
      studio: acc.studio + Number(e.studio_value),
    }),
    { count: 0, gross: 0, commission: 0, studio: 0 },
  );
}

export function byProfessional(
  earnings: EarningRow[],
  names: Map<string, { name: string; color: string }>,
): ProfessionalTotals[] {
  const map = new Map<string, ProfessionalTotals>();
  for (const e of earnings) {
    const meta = names.get(e.professional_id);
    const cur =
      map.get(e.professional_id) ??
      {
        professionalId: e.professional_id,
        name: meta?.name ?? "—",
        color: meta?.color ?? "#8B5CF6",
        count: 0,
        gross: 0,
        commission: 0,
        studio: 0,
      };
    cur.count += 1;
    cur.gross += Number(e.gross_value);
    cur.commission += Number(e.commission_value);
    cur.studio += Number(e.studio_value);
    map.set(e.professional_id, cur);
  }
  return [...map.values()].sort((a, b) => b.gross - a.gross);
}

export interface SeriesPoint {
  label: string;
  faturamento: number;
}

/** Série do gráfico: fatura por dia ou por mês, conforme o bucket. */
export function buildSeries(
  earnings: EarningRow[],
  bucket: "day" | "month",
): SeriesPoint[] {
  const acc = new Map<string, number>();
  for (const e of earnings) {
    const d = new Date(e.earned_at);
    const key = bucket === "day" ? format(d, "yyyy-MM-dd") : format(d, "yyyy-MM");
    acc.set(key, (acc.get(key) ?? 0) + Number(e.gross_value));
  }
  return [...acc.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, faturamento]) => ({
      label:
        bucket === "day"
          ? format(new Date(`${key}T00:00:00`), "dd/MM")
          : format(new Date(`${key}-01T00:00:00`), "MMM/yy"),
      faturamento,
    }));
}

/** CSV do consolidado por profissional (Excel-friendly: ; e BOM). */
export function professionalsCSV(rows: ProfessionalTotals[]): string {
  const header = ["Profissional", "Atendimentos", "Bruto", "Comissao", "Estudio"];
  const body = rows.map((r) => [
    r.name,
    String(r.count),
    r.gross.toFixed(2).replace(".", ","),
    r.commission.toFixed(2).replace(".", ","),
    r.studio.toFixed(2).replace(".", ","),
  ]);
  const lines = [header, ...body].map((cols) => cols.join(";"));
  return "﻿" + lines.join("\r\n");
}

/** CSV do fechamento do mês (comissão + bônus + total a pagar). */
export function closingCSV(
  rows: { name: string; commission: number; bonus: number; toPay: number }[],
): string {
  const money = (n: number) => n.toFixed(2).replace(".", ",");
  const header = ["Profissional", "Comissao", "Bonus", "Total a pagar"];
  const body = rows.map((r) => [
    r.name,
    money(r.commission),
    money(r.bonus),
    money(r.toPay),
  ]);
  return "﻿" + [header, ...body].map((c) => c.join(";")).join("\r\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
