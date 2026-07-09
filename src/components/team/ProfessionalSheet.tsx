import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import {
  type TeamMember,
  useProfessionalServices,
  useRemoveTeamMember,
  useSaveProfessional,
} from "@/hooks/useTeam";
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

interface SvcRow {
  checked: boolean;
  price: string;
  duration: string;
}

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
  const overrides = useProfessionalServices(member?.professional_id);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [commission, setCommission] = useState("50");
  const [color, setColor] = useState(SWATCHES[0]);
  const [bio, setBio] = useState("");
  const [active, setActive] = useState(true);
  const [svc, setSvc] = useState<Map<string, SvcRow>>(new Map());
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
    setError(null);
    setConfirmRemove(false);
    setRemoveError(null);
  }, [member]);

  // monta a grade de serviços quando serviços + overrides estão prontos
  useEffect(() => {
    if (!member) return;
    const ov = overrides.data ?? [];
    const map = new Map<string, SvcRow>();
    for (const s of services) {
      const o = ov.find((x) => x.serviceId === s.id);
      map.set(s.id, {
        checked: !!o,
        price: String(o?.price ?? s.price),
        duration: String(o?.durationMinutes ?? s.duration_minutes),
      });
    }
    setSvc(map);
  }, [member, services, overrides.data]);

  if (!member) return <Sheet open={open} onClose={onClose} title="" children={null} />;

  function setRow(id: string, patch: Partial<SvcRow>) {
    setSvc((prev) => {
      const next = new Map(prev);
      next.set(id, { ...next.get(id)!, ...patch });
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
    const chosen = [...svc.entries()].filter(([, r]) => r.checked);
    for (const [, r] of chosen) {
      if (Number(r.price) < 0 || Number(r.duration) <= 0) {
        setError("Preço e duração dos serviços devem ser válidos.");
        return;
      }
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
        services: chosen.map(([serviceId, r]) => ({
          serviceId,
          price: r.price === "" ? null : Number(r.price),
          durationMinutes: r.duration === "" ? null : Number(r.duration),
        })),
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
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Especialidades, anotações internas…"
            className="flex min-h-[70px] w-full rounded-xl border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Serviços, preços e durações</Label>
          <p className="text-xs text-muted-foreground">
            Marque os serviços que ela faz e ajuste o preço e a duração dela.
          </p>
          <div className="flex flex-col gap-1 rounded-xl border p-2">
            {services.map((s) => {
              const row = svc.get(s.id) ?? {
                checked: false,
                price: String(s.price),
                duration: String(s.duration_minutes),
              };
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50"
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={row.checked}
                      onChange={(e) => setRow(s.id, { checked: e.target.checked })}
                    />
                    <span className="min-w-[120px] flex-1">{s.name}</span>
                  </label>
                  {row.checked && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          min={0}
                          step={5}
                          aria-label={`Preço ${s.name}`}
                          value={row.price}
                          onChange={(e) => setRow(s.id, { price: e.target.value })}
                          className="h-9 w-20"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={5}
                          step={5}
                          aria-label={`Duração ${s.name}`}
                          value={row.duration}
                          onChange={(e) =>
                            setRow(s.id, { duration: e.target.value })
                          }
                          className="h-9 w-16"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {services.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">
                Cadastre serviços na aba Serviços primeiro.
              </p>
            )}
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
          Quem já tem atendimentos registrados não pode ser removida — nesse
          caso, desative acima.
        </p>
      </div>
    </Sheet>
  );
}
