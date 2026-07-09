import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import type { AgendaProfessional } from "@/hooks/useAgenda";
import { monthKey, useSaveGoals } from "@/hooks/useGoals";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function GoalSheet({
  open,
  onClose,
  professionals,
  month,
}: {
  open: boolean;
  onClose: () => void;
  professionals: AgendaProfessional[];
  month: Date;
}) {
  const save = useSaveGoals();
  const [target, setTarget] = useState("all");
  const [targetType, setTargetType] = useState<"revenue" | "appointments">(
    "revenue",
  );
  const [targetValue, setTargetValue] = useState("");
  const [bonusType, setBonusType] = useState<"fixed" | "extra_pct">("fixed");
  const [bonusValue, setBonusValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTarget("all");
    setTargetType("revenue");
    setTargetValue("");
    setBonusType("fixed");
    setBonusValue("");
    setError(null);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const tv = Number(targetValue);
    const bv = Number(bonusValue);
    if (Number.isNaN(tv) || tv <= 0 || Number.isNaN(bv) || bv < 0) {
      setError("Preencha os valores da meta e do bônus.");
      return;
    }
    const ids =
      target === "all" ? professionals.map((p) => p.id) : [target];
    if (ids.length === 0) {
      setError("Nenhuma profissional para aplicar a meta.");
      return;
    }
    try {
      await save.mutateAsync({
        professionalIds: ids,
        month: monthKey(month),
        targetType,
        targetValue: tv,
        bonusType,
        bonusValue: bv,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message ?? "Não foi possível salvar a meta.");
    }
  }

  const monthLabel = format(month, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nova meta"
      description={`Referente a ${monthLabel}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gtarget">Para quem</Label>
          <Select
            id="gtarget"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="all">Toda a equipe (uma meta para cada)</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gtype">Tipo de meta</Label>
          <Select
            id="gtype"
            value={targetType}
            onChange={(e) =>
              setTargetType(e.target.value as "revenue" | "appointments")
            }
          >
            <option value="revenue">Faturamento (R$ em serviços)</option>
            <option value="appointments">Atendimentos (quantidade)</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gval">
            {targetType === "revenue" ? "Meta (R$)" : "Meta (nº de atendimentos)"}
          </Label>
          <Input
            id="gval"
            type="number"
            min={0}
            step={targetType === "revenue" ? 50 : 1}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={targetType === "revenue" ? "Ex: 8000" : "Ex: 80"}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gbtype">Bônus</Label>
            <Select
              id="gbtype"
              value={bonusType}
              onChange={(e) =>
                setBonusType(e.target.value as "fixed" | "extra_pct")
              }
            >
              <option value="fixed">Fixo (R$)</option>
              <option value="extra_pct">Extra (%)</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gbval">
              {bonusType === "fixed" ? "Valor (R$)" : "Percentual (%)"}
            </Label>
            <Input
              id="gbval"
              type="number"
              min={0}
              step={bonusType === "fixed" ? 50 : 0.5}
              value={bonusValue}
              onChange={(e) => setBonusValue(e.target.value)}
              placeholder={bonusType === "fixed" ? "Ex: 300" : "Ex: 5"}
              required
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar meta"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Se já existir uma meta do mesmo tipo para a profissional neste mês, ela
          é substituída.
        </p>
      </form>
    </Sheet>
  );
}
