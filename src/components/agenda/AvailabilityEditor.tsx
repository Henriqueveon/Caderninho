import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAvailabilityExceptions,
  useAvailabilityRules,
  useDeleteException,
  useDeleteRule,
  useSaveException,
  useSaveRule,
} from "@/hooks/useAvailability";
import { useMyProfessional, useProfessionals } from "@/hooks/useAgenda";
import { WEEKDAY_LABELS_LONG } from "@/lib/dates";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Grade semanal recorrente + exceções pontuais.
 * scope "self": profissional edita a própria; "all": staff escolhe a profissional.
 */
export function AvailabilityEditor({ scope }: { scope: "self" | "all" }) {
  const { profile } = useAuth();
  const myPro = useMyProfessional();
  const allPros = useProfessionals();

  const [selectedPro, setSelectedPro] = useState<string>("");
  const professionalId =
    scope === "self" ? myPro.data?.id : selectedPro || undefined;
  const studioId = profile?.studio_id;

  const rules = useAvailabilityRules(professionalId);
  const exceptions = useAvailabilityExceptions(professionalId);
  const saveRule = useSaveRule();
  const deleteRule = useDeleteRule();
  const saveException = useSaveException();
  const deleteException = useDeleteException();

  const [weekday, setWeekday] = useState("2");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [ruleError, setRuleError] = useState<string | null>(null);

  const [excDate, setExcDate] = useState("");
  const [excType, setExcType] = useState<"block" | "extra">("block");
  const [excStart, setExcStart] = useState("");
  const [excEnd, setExcEnd] = useState("");
  const [excReason, setExcReason] = useState("");

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    setRuleError(null);
    if (start >= end) {
      setRuleError("O início deve ser antes do fim.");
      return;
    }
    if (!professionalId || !studioId) return;
    await saveRule.mutateAsync({
      studio_id: studioId,
      professional_id: professionalId,
      weekday: Number(weekday),
      start_time: start,
      end_time: end,
    });
  }

  async function addException(e: React.FormEvent) {
    e.preventDefault();
    if (!professionalId || !studioId || !excDate) return;
    await saveException.mutateAsync({
      studio_id: studioId,
      professional_id: professionalId,
      date: excDate,
      type: excType,
      start_time: excStart || null,
      end_time: excEnd || null,
      reason: excReason.trim() || null,
    });
    setExcDate("");
    setExcStart("");
    setExcEnd("");
    setExcReason("");
  }

  if (scope === "all" && !professionalId) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Disponibilidade</h1>
        <Select value={selectedPro} onChange={(e) => setSelectedPro(e.target.value)}>
          <option value="">Escolha a profissional…</option>
          {(allPros.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </Select>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Disponibilidade</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Horários recorrentes e exceções pontuais.
          </p>
        </div>
        {scope === "all" && (
          <Select
            className="w-48"
            value={selectedPro}
            onChange={(e) => setSelectedPro(e.target.value)}
          >
            {(allPros.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* Grade semanal recorrente */}
      <Card>
        <CardHeader>
          <CardTitle>Grade semanal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {(rules.data ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">
                Nenhum horário recorrente ainda.
              </li>
            )}
            {(rules.data ?? []).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium">
                    {WEEKDAY_LABELS_LONG[r.weekday]}
                  </span>{" "}
                  · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                </span>
                <button
                  aria-label="Remover"
                  onClick={() => deleteRule.mutate(r.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <form
            onSubmit={addRule}
            className="flex flex-wrap items-end gap-3 border-t pt-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wd">Dia</Label>
              <Select
                id="wd"
                className="w-36"
                value={weekday}
                onChange={(e) => setWeekday(e.target.value)}
              >
                {WEEKDAY_LABELS_LONG.map((w, i) => (
                  <option key={i} value={i}>
                    {w}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rs">Início</Label>
              <Input
                id="rs"
                type="time"
                className="w-32"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="re">Fim</Label>
              <Input
                id="re"
                type="time"
                className="w-32"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saveRule.isPending}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
            {ruleError && (
              <p role="alert" className="w-full text-sm text-destructive">
                {ruleError}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Exceções pontuais */}
      <Card>
        <CardHeader>
          <CardTitle>Folgas e horários extras</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {(exceptions.data ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">
                Nenhuma exceção futura.
              </li>
            )}
            {(exceptions.data ?? []).map((ex) => (
              <li
                key={ex.id}
                className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm"
              >
                <span>
                  <span
                    className={`mr-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                      ex.type === "block"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {ex.type === "block" ? "Folga" : "Extra"}
                  </span>
                  {format(new Date(`${ex.date}T00:00:00`), "d 'de' MMMM", {
                    locale: ptBR,
                  })}
                  {ex.start_time &&
                    ex.end_time &&
                    ` · ${ex.start_time.slice(0, 5)}–${ex.end_time.slice(0, 5)}`}
                  {ex.reason && (
                    <span className="text-muted-foreground"> · {ex.reason}</span>
                  )}
                </span>
                <button
                  aria-label="Remover"
                  onClick={() => deleteException.mutate(ex.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <form
            onSubmit={addException}
            className="flex flex-wrap items-end gap-3 border-t pt-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ed">Data</Label>
              <Input
                id="ed"
                type="date"
                className="w-40"
                value={excDate}
                onChange={(e) => setExcDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="et">Tipo</Label>
              <Select
                id="et"
                className="w-32"
                value={excType}
                onChange={(e) => setExcType(e.target.value as "block" | "extra")}
              >
                <option value="block">Folga</option>
                <option value="extra">Extra</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="es">Início</Label>
              <Input
                id="es"
                type="time"
                className="w-28"
                value={excStart}
                onChange={(e) => setExcStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ee">Fim</Label>
              <Input
                id="ee"
                type="time"
                className="w-28"
                value={excEnd}
                onChange={(e) => setExcEnd(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saveException.isPending}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
            <p className="w-full text-xs text-muted-foreground">
              Folga sem horário = dia inteiro indisponível. Extra = disponível
              fora da grade.
            </p>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
