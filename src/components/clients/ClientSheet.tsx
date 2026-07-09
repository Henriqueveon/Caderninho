import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_META } from "@/components/agenda/status";
import { useProfessionals } from "@/hooks/useAgenda";
import {
  type ClientStat,
  attendanceRate,
  useClientHistory,
  useRemoveClient,
  useSaveClient,
} from "@/hooks/useClients";
import { timeLabel } from "@/lib/dates";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ClientSheet({
  client,
  open,
  onClose,
}: {
  client: ClientStat | null;
  open: boolean;
  onClose: () => void;
}) {
  const isNew = !client;
  const save = useSaveClient();
  const remove = useRemoveClient();
  const history = useClientHistory(client?.id);
  const pros = useProfessionals();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(client?.full_name ?? "");
    setPhone(client?.phone ?? "");
    setEmail(client?.email ?? "");
    setNotes(client?.notes ?? "");
    setError(null);
    setConfirmRemove(false);
  }, [open, client]);

  const proName = (id: string) =>
    pros.data?.find((p) => p.id === id)?.full_name ?? "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError("Informe o nome da cliente.");
      return;
    }
    try {
      await save.mutateAsync({
        id: client?.id,
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message ?? "Não foi possível salvar.");
    }
  }

  const rate = client ? attendanceRate(client) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isNew ? "Nova cliente" : client!.full_name}
      description={isNew ? "Cadastro manual" : (client!.phone ?? undefined)}
    >
      <div className="flex flex-col gap-5">
        {client && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Visitas", value: String(client.done) },
              {
                label: "Presença",
                value: rate === null ? "—" : `${Math.round(rate * 100)}%`,
              },
              { label: "Próximos", value: String(client.upcoming) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-secondary p-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="tnums mt-0.5 text-lg font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cname">Nome</Label>
            <Input
              id="cname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cphone">Telefone</Label>
              <Input
                id="cphone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cemail">E-mail</Label>
              <Input
                id="cemail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cnotes">Observações</Label>
            <Textarea
              id="cnotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferências, alergias, anotações…"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </form>

        {client && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              Histórico de atendimentos
            </h3>
            {history.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : (history.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda sem atendimentos.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {history.data!.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{h.service?.name ?? "Atendimento"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(h.scheduled_start), "d MMM yyyy", {
                          locale: ptBR,
                        })}{" "}
                        · {timeLabel(h.scheduled_start)} · {proName(h.professional_id)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_META[h.status].badge}`}
                    >
                      {STATUS_META[h.status].label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {client && (
          <div className="border-t border-border pt-4">
            {confirmRemove ? (
              <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm">
                  Remover <strong>{client.full_name}</strong> do cadastro? O
                  histórico dos atendimentos é preservado.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      await remove.mutateAsync(client.id);
                      onClose();
                    }}
                    disabled={remove.isPending}
                  >
                    {remove.isPending ? "Removendo…" : "Confirmar"}
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
                onClick={() => setConfirmRemove(true)}
                className="inline-flex items-center gap-2 text-sm font-medium text-destructive hover:underline"
              >
                <Trash2 className="h-4 w-4" /> Remover cadastro
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
