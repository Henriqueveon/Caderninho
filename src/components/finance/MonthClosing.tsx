import { Download, Lock } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBonuses, useCloseMonth, useMarkBonusPaid } from "@/hooks/useBonuses";
import { periodLabel } from "@/lib/dates";
import { closingCSV, downloadCSV, type ProfessionalTotals } from "@/lib/finance";
import { formatBRL } from "@/lib/format";

interface ProBonus {
  value: number;
  ids: string[];
  allPaid: boolean;
}

export function MonthClosing({
  month,
  perPro,
}: {
  month: Date;
  perPro: ProfessionalTotals[];
}) {
  const bonuses = useBonuses(month);
  const close = useCloseMonth();
  const markPaid = useMarkBonusPaid();
  const [msg, setMsg] = useState<string | null>(null);

  const bonusByPro = new Map<string, ProBonus>();
  for (const b of bonuses.data ?? []) {
    const cur = bonusByPro.get(b.professional_id) ?? {
      value: 0,
      ids: [],
      allPaid: true,
    };
    cur.value += Number(b.value);
    cur.ids.push(b.id);
    cur.allPaid = cur.allPaid && b.status === "paid";
    bonusByPro.set(b.professional_id, cur);
  }

  const rows = perPro.map((p) => {
    const b = bonusByPro.get(p.professionalId);
    return {
      ...p,
      bonus: b?.value ?? 0,
      bonusIds: b?.ids ?? [],
      allPaid: b?.allPaid ?? false,
      toPay: p.commission + (b?.value ?? 0),
    };
  });

  const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
  const totalBonus = rows.reduce((s, r) => s + r.bonus, 0);
  const totalToPay = rows.reduce((s, r) => s + r.toPay, 0);

  async function handleClose() {
    setMsg(null);
    const r = await close.mutateAsync(month);
    setMsg(
      r.generated > 0
        ? `${r.generated} bônus gerado(s), somando ${formatBRL(r.total)}.`
        : r.alreadyClosed
          ? "Mês já fechado — nenhum bônus novo a gerar."
          : "Nenhuma meta batida neste mês.",
    );
  }

  async function togglePaid(ids: string[], paid: boolean) {
    await Promise.all(ids.map((id) => markPaid.mutateAsync({ id, paid })));
  }

  function exportClosing() {
    const label = periodLabel(month, "month").replace(/[^\w]+/g, "-");
    downloadCSV(
      `fechamento-${label}.csv`,
      closingCSV(
        rows.map((r) => ({
          name: r.name,
          commission: r.commission,
          bonus: r.bonus,
          toPay: r.toPay,
        })),
      ),
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Fechamento do mês</p>
            <p className="text-sm text-muted-foreground">
              Gere os bônus das metas batidas e feche o total a pagar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportClosing}
              disabled={rows.length === 0}
            >
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button size="sm" onClick={handleClose} disabled={close.isPending}>
              <Lock className="h-4 w-4" />
              {close.isPending ? "Fechando…" : "Fechar mês"}
            </Button>
          </div>
        </div>

        {msg && (
          <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm">{msg}</p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Profissional</th>
                <th className="py-2 pr-4 text-right font-medium">Comissão</th>
                <th className="py-2 pr-4 text-right font-medium">Bônus</th>
                <th className="py-2 pr-4 text-right font-medium">Total a pagar</th>
                <th className="py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    Sem movimento neste mês.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.professionalId} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                        style={{ backgroundColor: r.color }}
                      />
                      {r.name}
                    </td>
                    <td className="tnums py-3 pr-4 text-right">
                      {formatBRL(r.commission)}
                    </td>
                    <td className="tnums py-3 pr-4 text-right text-primary">
                      {r.bonus > 0 ? formatBRL(r.bonus) : "—"}
                    </td>
                    <td className="tnums py-3 pr-4 text-right font-semibold">
                      {formatBRL(r.toPay)}
                    </td>
                    <td className="py-3 text-right">
                      {r.bonus > 0 ? (
                        <button
                          onClick={() => togglePaid(r.bonusIds, !r.allPaid)}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            r.allPaid
                              ? "bg-success/15 text-success"
                              : "bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {r.allPaid ? "Pago" : "Marcar pago"}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="py-3 pr-4">Total</td>
                  <td className="tnums py-3 pr-4 text-right">
                    {formatBRL(totalCommission)}
                  </td>
                  <td className="tnums py-3 pr-4 text-right text-primary">
                    {formatBRL(totalBonus)}
                  </td>
                  <td className="tnums py-3 pr-4 text-right">
                    {formatBRL(totalToPay)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
