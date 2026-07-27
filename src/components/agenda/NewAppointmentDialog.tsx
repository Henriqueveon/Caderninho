import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  type AgendaProfessional,
  type AppointmentRow,
  useBookAppointment,
  useEditAppointment,
} from "@/hooks/useAgenda";
import { useClientOptions, useSaveClient } from "@/hooks/useClients";
import { METHOD_LABEL } from "@/hooks/usePayments";
import { useProfessionalServices } from "@/hooks/useTeam";
import { formatBRL, formatMinutes } from "@/lib/format";
import type { PaymentMethod, Service } from "@/types/database";

const PAY_METHODS: PaymentMethod[] = ["pix", "cash", "debit", "credit", "other"];

export interface NewApptDefaults {
  professionalId?: string;
  start?: Date;
}

interface OfferedService {
  serviceId: string;
  name: string;
  price: number;
  duration: number;
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
  editing,
}: {
  open: boolean;
  onClose: () => void;
  professionals: AgendaProfessional[];
  services: Service[];
  defaults: NewApptDefaults;
  fixedProfessionalId?: string;
  editing?: AppointmentRow | null;
}) {
  const book = useBookAppointment();
  const edit = useEditAppointment();
  const saveClient = useSaveClient();
  const clients = useClientOptions();
  const isEdit = !!editing;
  const effectiveFixed = isEdit ? undefined : fixedProfessionalId;

  const [professionalId, setProfessionalId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [time, setTime] = useState(() => toTimeInput(new Date()));
  const [clientSel, setClientSel] = useState(""); // "" | id | "__avulsa__" | "__nova__"
  const [clientName, setClientName] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("pix");
  const [error, setError] = useState<string | null>(null);

  const isDoneEdit = isEdit && editing?.status === "done";

  const pid = effectiveFixed ?? professionalId;
  const proServices = useProfessionalServices(pid || undefined);

  const offered = useMemo<OfferedService[]>(() => {
    return (proServices.data ?? [])
      .map((o) => {
        const s = services.find((x) => x.id === o.serviceId);
        if (!s) return null;
        return {
          serviceId: o.serviceId,
          name: s.name,
          price: o.price ?? s.price,
          duration: o.durationMinutes ?? s.duration_minutes,
        };
      })
      .filter(Boolean) as OfferedService[];
  }, [proServices.data, services]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const start = new Date(editing.scheduled_start);
      setProfessionalId(editing.professional_id);
      const ids = (editing.items ?? [])
        .map((it) => it.service_id)
        .filter((x): x is string => !!x);
      setServiceIds(ids.length ? ids : [editing.service_id]);
      setDate(toDateInput(start));
      setTime(toTimeInput(start));
      setNotes(editing.notes ?? "");
      setPayMethod((editing.payment_method as PaymentMethod) ?? "pix");
      if (editing.client_record_id) setClientSel(editing.client_record_id);
      else if (editing.client_name_snapshot) {
        setClientSel("__avulsa__");
        setClientName(editing.client_name_snapshot);
      } else setClientSel("");
    } else {
      const start = defaults.start ?? new Date();
      setProfessionalId(fixedProfessionalId ?? defaults.professionalId ?? "");
      setDate(toDateInput(start));
      setTime(toTimeInput(start));
      setServiceIds([]);
      setClientSel("");
      setClientName("");
    }
    setNewName("");
    setNewPhone("");
    setError(null);
  }, [open, editing, defaults, fixedProfessionalId]);

  // fallback p/ resolver serviços que não estejam mais na lista da profissional (edição)
  const itemFallback = useMemo(() => {
    const m = new Map<string, OfferedService>();
    for (const it of editing?.items ?? []) {
      if (it.service_id)
        m.set(it.service_id, {
          serviceId: it.service_id,
          name: it.name_snapshot,
          price: it.price,
          duration: it.duration_minutes,
        });
    }
    return m;
  }, [editing]);

  const resolve = (sid: string): OfferedService | undefined =>
    offered.find((o) => o.serviceId === sid) ?? itemFallback.get(sid);

  // ao trocar de profissional, descarta serviços que ela não oferece
  useEffect(() => {
    if (!editing && pid && offered.length > 0) {
      setServiceIds((ids) => ids.filter((sid) => offered.some((o) => o.serviceId === sid)));
    }
  }, [offered, editing, pid]);

  const selectedItems = serviceIds
    .map((sid) => resolve(sid))
    .filter(Boolean) as OfferedService[];
  const totalPrice = selectedItems.reduce((s, o) => s + o.price, 0);
  const totalDuration = selectedItems.reduce((s, o) => s + o.duration, 0);

  async function createClient() {
    if (!newName.trim()) {
      setError("Informe o nome da nova cliente.");
      return;
    }
    setError(null);
    try {
      const id = await saveClient.mutateAsync({
        fullName: newName.trim(),
        phone: newPhone.trim() || null,
        email: null,
        notes: null,
      });
      await clients.refetch();
      setClientSel(id);
      setNewName("");
      setNewPhone("");
    } catch (err) {
      setError((err as Error).message ?? "Não foi possível cadastrar a cliente.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pid || serviceIds.length === 0) {
      setError("Escolha a profissional e ao menos um serviço.");
      return;
    }
    if (clientSel === "__nova__") {
      setError("Termine de cadastrar a nova cliente (ou escolha outra opção).");
      return;
    }
    const [h, min] = time.split(":").map(Number);
    const start = new Date(`${date}T00:00:00`);
    start.setHours(h, min, 0, 0);
    const isRegistered = clientSel && clientSel !== "__avulsa__";
    const clientRecordId = isRegistered ? clientSel : undefined;
    const avulsaName =
      clientSel === "__avulsa__" ? clientName.trim() || undefined : undefined;

    try {
      if (editing) {
        await edit.mutateAsync({
          id: editing.id,
          professionalId: pid,
          serviceIds,
          scheduledStart: start,
          clientRecordId,
          clientName: avulsaName,
          notes: notes.trim() || undefined,
          paymentMethod: isDoneEdit ? payMethod : undefined,
        });
      } else {
        await book.mutateAsync({
          professionalId: pid,
          serviceIds,
          scheduledStart: start,
          clientRecordId,
          clientName: avulsaName,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError((err as Error).message ?? "Não foi possível salvar.");
    }
  }

  const endPreview = (() => {
    if (totalDuration === 0) return null;
    const [h, m] = time.split(":").map(Number);
    const end = new Date();
    end.setHours(h, m + totalDuration, 0, 0);
    return toTimeInput(end);
  })();

  const pending = book.isPending || edit.isPending;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar atendimento" : "Novo atendimento"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!effectiveFixed && (
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
          <Label htmlFor="svc">Serviços</Label>
          {serviceIds.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {serviceIds.map((sid, idx) => {
                const o = resolve(sid);
                return (
                  <li
                    key={idx}
                    className="flex items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {o?.name ?? "Serviço"}
                      <span className="text-muted-foreground">
                        {" · "}
                        {formatBRL(o?.price ?? 0)} · {formatMinutes(o?.duration ?? 0)}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label="Remover serviço"
                      onClick={() =>
                        setServiceIds((ids) => ids.filter((_, i) => i !== idx))
                      }
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <Select
            id="svc"
            value=""
            disabled={!pid}
            onChange={(e) => {
              if (e.target.value)
                setServiceIds((ids) => [...ids, e.target.value]);
            }}
          >
            <option value="">
              {!pid
                ? "Escolha a profissional primeiro"
                : offered.length === 0
                  ? "Esta profissional não tem serviços"
                  : serviceIds.length > 0
                    ? "+ Adicionar outro serviço…"
                    : "Selecione…"}
            </option>
            {offered.map((o) => (
              <option key={o.serviceId} value={o.serviceId}>
                {o.name} · {formatBRL(o.price)} · {formatMinutes(o.duration)}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="time">Início</Label>
            <Input id="time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        {selectedItems.length > 0 && endPreview && (
          <p className="text-xs text-muted-foreground">
            Total <span className="font-medium text-foreground">{formatBRL(totalPrice)}</span> ·{" "}
            {formatMinutes(totalDuration)} · término previsto às {endPreview}.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client">Cliente</Label>
          <Select
            id="client"
            value={clientSel}
            onChange={(e) => {
              setClientSel(e.target.value);
              if (e.target.value !== "__avulsa__") setClientName("");
            }}
          >
            <option value="">Sem cadastro</option>
            {(clients.data ?? []).length > 0 && (
              <optgroup label="Cadastradas">
                {clients.data!.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </optgroup>
            )}
            <option value="__avulsa__">Avulsa (digitar nome)…</option>
            <option value="__nova__">+ Cadastrar nova cliente…</option>
          </Select>

          {clientSel === "__avulsa__" && (
            <Input
              className="mt-2"
              placeholder="Nome da cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          )}

          {clientSel === "__nova__" && (
            <div className="mt-2 flex flex-col gap-2 rounded-xl bg-secondary p-3">
              <Input
                placeholder="Nome da cliente"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder="Telefone (opcional)"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={createClient}
                disabled={saveClient.isPending}
              >
                {saveClient.isPending ? "Cadastrando…" : "Cadastrar e usar"}
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {isDoneEdit && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pmethod">Forma de pagamento da cliente</Label>
            <Select
              id="pmethod"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
            >
              {PAY_METHODS.map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABEL[m]}
                </option>
              ))}
            </Select>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending
            ? "Salvando…"
            : isEdit
              ? "Salvar alterações"
              : "Agendar"}
        </Button>
      </form>
    </Sheet>
  );
}
