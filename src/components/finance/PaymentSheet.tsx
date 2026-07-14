import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { AgendaProfessional } from "@/hooks/useAgenda";
import { useSavePayment } from "@/hooks/usePayments";
import type { Payment, PaymentKind, PaymentMethod } from "@/types/database";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PaymentSheet({
  open,
  onClose,
  professionals,
  editing,
  defaultProfessionalId,
}: {
  open: boolean;
  onClose: () => void;
  professionals: AgendaProfessional[];
  editing: Payment | null;
  defaultProfessionalId?: string;
}) {
  const save = useSavePayment();

  const [professionalId, setProfessionalId] = useState("");
  const [kind, setKind] = useState<PaymentKind>("payment");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayStr());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setProfessionalId(editing?.professional_id ?? defaultProfessionalId ?? "");
    setKind(editing?.kind ?? "payment");
    setMethod(editing?.method ?? "pix");
    setAmount(editing ? String(editing.amount) : "");
    setPaidAt(editing?.paid_at ?? todayStr());
    setNotes(editing?.notes ?? "");
    setError(null);
  }, [open, editing, defaultProfessionalId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!professionalId) {
      setError("Escolha a profissional.");
      return;
    }
    if (Number.isNaN(value) || value <= 0) {
      setError("Informe um valor válido.");
      return;
    }
    try {
      await save.mutateAsync({
        id: editing?.id,
        professionalId,
        kind,
        method,
        amount: value,
        paidAt,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message ?? "Não foi possível salvar.");
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Editar lançamento" : "Registrar pagamento"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pprof">Profissional</Label>
          <Select
            id="pprof"
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pkind">Tipo</Label>
            <Select
              id="pkind"
              value={kind}
              onChange={(e) => setKind(e.target.value as PaymentKind)}
            >
              <option value="payment">Pagamento</option>
              <option value="advance">Vale (adiantamento)</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pmethod">Forma</Label>
            <Select
              id="pmethod"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            >
              <option value="pix">PIX</option>
              <option value="cash">Dinheiro</option>
              <option value="debit">Débito</option>
              <option value="credit">Crédito</option>
              <option value="other">Outro</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pamount">Valor (R$)</Label>
            <Input
              id="pamount"
              type="number"
              min={0}
              step={10}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pdate">Data</Label>
            <Input
              id="pdate"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pnotes">Observação</Label>
          <Textarea
            id="pnotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: pagamento da semana, referente a…"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar lançamento"}
        </Button>
      </form>
    </Sheet>
  );
}
