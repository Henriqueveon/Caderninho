import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import {
  type ServiceInput,
  useRemoveService,
  useSaveService,
} from "@/hooks/useServiceAdmin";
import type { Service } from "@/types/database";

/** service = null → novo serviço. */
export function ServiceSheet({
  service,
  open,
  onClose,
}: {
  service: Service | null;
  open: boolean;
  onClose: () => void;
}) {
  const save = useSaveService();
  const remove = useRemoveService();
  const isNew = !service;

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [override, setOverride] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? "");
    setPrice(service ? String(service.price) : "");
    setDuration(service ? String(service.duration_minutes) : "60");
    setOverride(
      service?.commission_pct_override != null
        ? String(service.commission_pct_override)
        : "",
    );
    setActive(service?.active ?? true);
    setError(null);
    setConfirmRemove(false);
    setRemoveError(null);
  }, [open, service]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const p = Number(price);
    const d = Number(duration);
    if (!name.trim() || Number.isNaN(p) || p < 0) {
      setError("Informe nome e preço válidos.");
      return;
    }
    if (Number.isNaN(d) || d <= 0) {
      setError("A duração deve ser maior que zero.");
      return;
    }
    const payload: ServiceInput = {
      id: service?.id,
      name: name.trim(),
      price: p,
      durationMinutes: d,
      commissionOverride: override.trim() === "" ? null : Number(override),
      active,
    };
    try {
      await save.mutateAsync(payload);
      onClose();
    } catch (err) {
      setError((err as Error).message ?? "Não foi possível salvar.");
    }
  }

  async function handleRemove() {
    setRemoveError(null);
    try {
      await remove.mutateAsync(service!.id);
      onClose();
    } catch (err) {
      setRemoveError((err as Error).message ?? "Não foi possível excluir.");
      setConfirmRemove(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isNew ? "Novo serviço" : service!.name}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sname">Nome</Label>
          <Input
            id="sname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Esmaltação em gel"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sprice">Preço (R$)</Label>
            <Input
              id="sprice"
              type="number"
              min={0}
              step={0.5}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sdur">Duração (min)</Label>
            <Input
              id="sdur"
              type="number"
              min={5}
              step={5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sover">Comissão específica (%)</Label>
          <Input
            id="sover"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            placeholder="Deixe vazio p/ usar o % da profissional"
          />
          <p className="text-xs text-muted-foreground">
            Se preenchido, este serviço usa esta comissão em vez do percentual
            base da profissional.
          </p>
        </div>

        <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
          <span>
            <span className="font-medium">Ativo</span>
            <span className="block text-xs text-muted-foreground">
              Inativo some do catálogo e dos agendamentos.
            </span>
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-primary"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </form>

      {!isNew && (
        <div className="mt-6 border-t pt-4">
          {removeError && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {removeError}
            </p>
          )}
          {confirmRemove ? (
            <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm">
                Excluir <strong>{service!.name}</strong>? Esta ação não pode ser
                desfeita.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={remove.isPending}
                >
                  {remove.isPending ? "Excluindo…" : "Confirmar exclusão"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirmRemove(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRemoveError(null);
                setConfirmRemove(true);
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-destructive hover:underline"
            >
              <Trash2 className="h-4 w-4" /> Excluir serviço
            </button>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Serviço já usado em atendimentos não pode ser excluído — desative-o
            para preservar o histórico.
          </p>
        </div>
      )}
    </Sheet>
  );
}
