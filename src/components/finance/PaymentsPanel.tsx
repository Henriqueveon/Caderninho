import { Download, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProfessionals } from "@/hooks/useAgenda";
import { useBonuses } from "@/hooks/useBonuses";
import {
  KIND_LABEL,
  METHOD_LABEL,
  useDeletePayment,
  usePayments,
} from "@/hooks/usePayments";
import type { DateRange, Period } from "@/lib/dates";
import { downloadCSV, type ProfessionalTotals } from "@/lib/finance";
import { formatBRL } from "@/lib/format";
import type { Payment } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentSheet } from "./PaymentSheet";

export function PaymentsPanel({
  perPro,
  anchor,
  period,
  range,
}: {
  perPro: ProfessionalTotals[];
  anchor: Date;
  period: Period;
  range: DateRange;
}) {
  const professionals = useProfessionals();
  const payments = usePayments(range);
  const bonuses = useBonuses(anchor);
  const del = useDeletePayment();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);

  const commissionByPro = new Map(
    perPro.map((p) => [p.professionalId, p.commission]),
  );
  const bonusByPro = new Map<string, number>();
  if (period === "month") {
    for (const b of bonuses.data ?? []) {
      bonusByPro.set(
        b.professional_id,
        (bonusByPro.get(b.professional_id) ?? 0) + Number(b.value),
      );
    }
  }
  const paidByPro = new Map<string, number>();
  for (const p of payments.data ?? []) {
    paidByPro.set(
      p.professional_id,
      (paidByPro.get(p.professional_id) ?? 0) + Number(p.amount),
    );
  }

  const rows = (professionals.data ?? []).map((pro) => {
    const commission = commissionByPro.get(pro.id) ?? 0;
    const bonus = bonusByPro.get(pro.id) ?? 0;
    const earned = commission + bonus;
    const paid = paidByPro.get(pro.id) ?? 0;
    return {
      id: pro.id,
      name: pro.full_name,
      color: pro.color,
      earned,
      paid,
      saldo: earned - paid,
    };
  });

  const proName = (id: string) =>
    professionals.data?.find((p) => p.id === id)?.full_name ?? "—";

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(p: Payment) {
    setEditing(p);
    setOpen(true);
  }

  function exportPayments() {
    const money = (n: number) => n.toFixed(2).replace(".", ",");
    const header = ["Data", "Profissional", "Tipo", "Forma", "Valor", "Obs"];
    const body = (payments.data ?? []).map((p) => [
      p.paid_at.split("-").reverse().join("/"),
      proName(p.professional_id),
      KIND_LABEL[p.kind],
      p.method ? METHOD_LABEL[p.method] : "",
      money(Number(p.amount)),
      p.notes ?? "",
    ]);
    downloadCSV(
      "pagamentos.csv",
      "﻿" + [header, ...body].map((c) => c.join(";")).join("\r\n"),
    );
  }

  // Tabela ainda não criada no banco
  if (payments.isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <Wallet className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Pagamentos ainda não ativados</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Aplique a migration <code>0012_payments.sql</code> no Supabase (SQL
            Editor) para habilitar o controle de pagamentos e vales.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Saldo por profissional */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="p-4 font-medium">Profissional</th>
                  <th className="p-4 text-right font-medium">A receber</th>
                  <th className="p-4 text-right font-medium">Pago no período</th>
                  <th className="p-4 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="p-4">
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                        style={{ backgroundColor: r.color }}
                      />
                      {r.name}
                    </td>
                    <td className="tnums p-4 text-right">{formatBRL(r.earned)}</td>
                    <td className="tnums p-4 text-right">{formatBRL(r.paid)}</td>
                    <td
                      className={`tnums p-4 text-right font-semibold ${
                        r.saldo > 0.005
                          ? "text-warning"
                          : r.saldo < -0.005
                            ? "text-destructive"
                            : "text-success"
                      }`}
                    >
                      {formatBRL(r.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="-mt-2 text-xs text-muted-foreground">
        Saldo = comissão{period === "month" ? " + bônus" : ""} do período − pagamentos e vales.
        Saldo positivo (âmbar) = a pagar; negativo (vermelho) = adiantado.
      </p>

      {/* Lançamentos */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Lançamentos do período
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportPayments}
            disabled={(payments.data ?? []).length === 0}
          >
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> Registrar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {payments.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : (payments.data ?? []).length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhum pagamento registrado neste período.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {payments.data!.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-4">
                  <div className="w-16 shrink-0 text-sm">
                    {format(new Date(`${p.paid_at}T00:00:00`), "dd/MM", {
                      locale: ptBR,
                    })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{proName(p.professional_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      <span
                        className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          p.kind === "advance"
                            ? "bg-warning/15 text-warning"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {KIND_LABEL[p.kind]}
                      </span>
                      {p.method ? METHOD_LABEL[p.method] : ""}
                      {p.notes ? ` · ${p.notes}` : ""}
                    </p>
                  </div>
                  <span className="tnums shrink-0 font-medium">
                    {formatBRL(Number(p.amount))}
                  </span>
                  <button
                    aria-label="Editar"
                    onClick={() => openEdit(p)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Remover"
                    onClick={() => del.mutate(p.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PaymentSheet
        open={open}
        onClose={() => setOpen(false)}
        professionals={professionals.data ?? []}
        editing={editing}
      />
    </div>
  );
}
