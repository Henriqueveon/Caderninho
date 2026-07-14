import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useSaveStudio, useStudio } from "@/hooks/useStudio";

export function SettingsPage() {
  const studio = useStudio();
  const save = useSaveStudio();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [openStart, setOpenStart] = useState("08:00");
  const [openEnd, setOpenEnd] = useState("20:00");
  const [minCancel, setMinCancel] = useState("4");
  const [slotStep, setSlotStep] = useState("15");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = studio.data;
    if (!s) return;
    setName(s.name ?? "");
    setPhone(s.phone ?? "");
    setAddress(s.address ?? "");
    setOpenStart(s.settings?.opening_hours?.start ?? "08:00");
    setOpenEnd(s.settings?.opening_hours?.end ?? "20:00");
    setMinCancel(String(s.settings?.min_cancel_hours ?? 4));
    setSlotStep(String(s.settings?.slot_step_minutes ?? 15));
  }, [studio.data]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (openStart >= openEnd) {
      setError("O horário de abertura deve ser antes do fechamento.");
      return;
    }
    try {
      await save.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        settings: {
          ...(studio.data?.settings ?? {}),
          opening_hours: { start: openStart, end: openEnd },
          min_cancel_hours: Number(minCancel),
          slot_step_minutes: Number(slotStep),
        },
      });
      setSaved(true);
    } catch (err) {
      setError((err as Error).message ?? "Não foi possível salvar.");
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dados do estúdio e regras de funcionamento.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Estúdio</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome do estúdio</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funcionamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="openStart">Abertura</Label>
                <Input
                  id="openStart"
                  type="time"
                  value={openStart}
                  onChange={(e) => setOpenStart(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="openEnd">Fechamento</Label>
                <Input
                  id="openEnd"
                  type="time"
                  value={openEnd}
                  onChange={(e) => setOpenEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minCancel">
                  Antecedência mínima p/ cancelamento (horas)
                </Label>
                <Input
                  id="minCancel"
                  type="number"
                  min={0}
                  value={minCancel}
                  onChange={(e) => setMinCancel(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="slotStep">Intervalo entre horários</Label>
                <Select
                  id="slotStep"
                  value={slotStep}
                  onChange={(e) => setSlotStep(e.target.value)}
                >
                  <option value="10">10 minutos</option>
                  <option value="15">15 minutos</option>
                  <option value="20">20 minutos</option>
                  <option value="30">30 minutos</option>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A antecedência mínima vale para o cancelamento pela cliente; o
              intervalo define os horários oferecidos no agendamento online.
            </p>
          </CardContent>
        </Card>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar configurações"}
          </Button>
          {saved && (
            <span className="text-sm font-medium text-success">
              Salvo com sucesso.
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
