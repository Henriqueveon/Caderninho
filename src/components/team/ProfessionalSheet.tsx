import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  type TeamMember,
  useRemoveTeamMember,
  useSaveProfessional,
} from "@/hooks/useTeam";
import { formatBRL, formatMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Service } from "@/types/database";

const SWATCHES = [
  "#8B5CF6",
  "#F472B6",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#EF4444",
  "#14B8A6",
  "#A855F7",
];

export function ProfessionalSheet({
  member,
  services,
  open,
  onClose,
}: {
  member: TeamMember | null;
  services: Service[];
  open: boolean;
  onClose: () => void;
}) {
  const save = useSaveProfessional();
  const remove = useRemoveTeamMember();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [commission, setCommission] = useState("50");
  const [color, setColor] = useState(SWATCHES[0]);
  const [bio, setBio] = useState("");
  const [active, setActive] = useState(true);
  const [serviceIds, setServiceIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;
    setFullName(member.full_name);
    setPhone(member.phone ?? "");
    setCommission(String(member.commission_pct));
    setColor(member.color);
    setBio(member.bio ?? "");
    setActive(member.active);
    setServiceIds(new Set(member.service_ids));
    setError(null);
    setConfirmRemove(false);
    setRemoveError(null);
  }, [member]);

  if (!member) return <Sheet open={open} onClose={onClose} title="" children={null} />;

  function toggleService(id: string) {
    setServiceIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pct = Number(commission);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError("A comissão deve ser um número entre 0 e 100.");
      return;
    }
    try {
      await save.mutateAsync({
        professionalId: member!.professional_id,
        profileId: member!.profile_id,
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        commissionPct: pct,
        color,
        bio: bio.trim() || null,
        active,
        serviceIds: [...serviceIds],
      });
      onClose();
    } catch (err) {
      setError((err as Error).message ?? "Não foi possível salvar.");
    }
  }

  async function handleRemove() {
    setRemoveError(null);
    try {
      await remove.mutateAsync(member!.professional_id);
      onClose();
    } catch (err) {
      // ex.: profissional com histórico → sugerir desativar
      setRemoveError((err as Error).message ?? "Não foi possível remover.");
      setConfirmRemove(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={member.full_name}
      description={member.email}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comm">Comissão (%)</Label>
            <Input
              id="comm"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Cor na agenda</Label>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor ${c}`}
                onClick={() => setColor(c)}
                className={cn(
                  "h-8 w-8 rounded-full ring-offset-2 transition",
                  color === c && "ring-2 ring-foreground",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bio">Bio / observações</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Especialidades, anotações internas…"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Serviços que executa</Label>
          <div className="flex flex-col gap-1.5 rounded-xl border p-3">
            {services.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={serviceIds.has(s.id)}
                  onChange={() => toggleService(s.id)}
                />
                <span className="flex-1">{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatBRL(s.price)} · {formatMinutes(s.duration_minutes)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
          <span>
            <span className="font-medium">Ativa</span>
            <span className="block text-xs text-muted-foreground">
              Inativa some da agenda e dos agendamentos.
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

      {/* Zona de remoção */}
      <div className="mt-6 border-t pt-4">
        {removeError && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {removeError}
          </p>
        )}
        {confirmRemove ? (
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm">
              Remover <strong>{member.full_name}</strong> da equipe? Esta ação
              não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemove}
                disabled={remove.isPending}
              >
                {remove.isPending ? "Removendo…" : "Confirmar remoção"}
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
            <Trash2 className="h-4 w-4" /> Remover da equipe
          </button>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Quem já tem atendimentos registrados não pode ser removida (para
          preservar o histórico) — nesse caso, desative acima.
        </p>
      </div>
    </Sheet>
  );
}
