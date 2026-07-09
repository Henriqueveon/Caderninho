import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  type AgendaProfessional,
  useBookAppointment,
} from "@/hooks/useAgenda";
import { formatBRL, formatMinutes } from "@/lib/format";
import type { Service } from "@/types/database";

export interface NewApptDefaults {
  professionalId?: string;
  start?: Date;
}

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function toTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function NewAppointmentDialog({
  open,
  onClose,
  professionals,
  services,
  defaults,
  fixedProfessionalId,
}: {
  open: boolean;
  onClose: () => void;
  professionals: AgendaProfessional[];
  services: Service[];
  defaults: NewApptDefaults;
  fixedProfessionalId?: string;
}) {
  const book = useBookAppointment();
  const now = defaults.start ?? new Date();

  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(toDateInput(now));
  const [time, setTime] = useState(toTimeInput(now));
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const start = defaults.start ?? new Date();
    setProfessionalId(fixedProfessionalId ?? defaults.professionalId ?? "");
    setDate(toDateInput(start));
    setTime(toTimeInput(start));
    setServiceId("");
    setClientName("");
    setNotes("");
    setError(null);
  }, [open, defaults, fixedProfessionalId]);

  const selectedService = services.find((s) => s.id === serviceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pid = fixedProfessionalId ?? professionalId;
    if (!pid || !serviceId) {
      setError("Escolha a profissional e o serviço.");
      return;
    }
    const [h, min] = time.split(":").map(Number);
    const start = new Date(`${date}T00:00:00`);
    start.setHours(h, min, 0, 0);
    try {
      await book.mutateAsync({
        professionalId: pid,
        serviceId,
        scheduledStart: start,
        clientName: clientName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message ?? "Não foi possível agendar.");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Novo atendimento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!fixedProfessionalId && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prof">Profissional</Label>
            <Select
              id="prof"
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
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="svc">Serviço</Label>
          <Select
            id="svc"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatBRL(s.price)} · {formatMinutes(s.duration_minutes)}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="time">Início</Label>
            <Input
              id="time"
              type="time"
              step={900}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        {selectedService && (
          <p className="text-xs text-muted-foreground">
            Término previsto às{" "}
            {(() => {
              const [h, m] = time.split(":").map(Number);
              const end = new Date();
              end.setHours(h, m + selectedService.duration_minutes, 0, 0);
              return toTimeInput(end);
            })()}
            .
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client">Cliente</Label>
          <Input
            id="client"
            placeholder="Nome da cliente (avulsa)"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={book.isPending}>
          {book.isPending ? "Agendando…" : "Agendar"}
        </Button>
      </form>
    </Sheet>
  );
}
