import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  type AgendaProfessional,
  type AppointmentRow,
  useAppointments,
  useMyProfessional,
  useProfessionals,
  useServices,
} from "@/hooks/useAgenda";
import {
  PERIOD_LABELS,
  type Period,
  periodLabel,
  periodRange,
  shiftPeriod,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import { AppointmentSheet } from "./AppointmentSheet";
import { DayView } from "./DayView";
import { MonthView } from "./MonthView";
import {
  type NewApptDefaults,
  NewAppointmentDialog,
} from "./NewAppointmentDialog";
import { PeriodStats } from "./PeriodStats";
import { WeekView } from "./WeekView";

interface AgendaPageProps {
  /** "all" = gestora/secretária (todas as agendas); "self" = profissional. */
  scope: "all" | "self";
  showRevenue: boolean;
}

const PERIODS: Period[] = ["day", "week", "month"];

export function AgendaPage({ scope, showRevenue }: AgendaPageProps) {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<Period>("day");
  const [anchor, setAnchor] = useState(() => new Date());
  const [filterProf, setFilterProf] = useState<string>("all");
  const [sheetAppt, setSheetAppt] = useState<AppointmentRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newDefaults, setNewDefaults] = useState<NewApptDefaults>({});
  const [editingAppt, setEditingAppt] = useState<AppointmentRow | null>(null);

  const allProfessionals = useProfessionals();
  const myProfessional = useMyProfessional();
  const services = useServices();

  const range = useMemo(() => periodRange(anchor, period), [anchor, period]);

  // profissional efetiva para escopo self
  const selfPro: AgendaProfessional | null =
    scope === "self" && myProfessional.data && profile
      ? {
          id: myProfessional.data.id,
          profile_id: profile.id,
          full_name: profile.full_name,
          color: myProfessional.data.color,
          bio: null,
        }
      : null;

  const professionals: AgendaProfessional[] =
    scope === "self"
      ? selfPro
        ? [selfPro]
        : []
      : allProfessionals.data ?? [];

  const filteredProfessionals =
    scope === "self"
      ? professionals
      : filterProf === "all"
        ? professionals
        : professionals.filter((p) => p.id === filterProf);

  const queryProfId =
    scope === "self"
      ? selfPro?.id
      : filterProf === "all"
        ? undefined
        : filterProf;

  const appointments = useAppointments(range, queryProfId);
  const appts = appointments.data ?? [];

  const weekProfessional = filteredProfessionals[0];

  // Na semana mostramos uma profissional por vez; as estatísticas seguem o
  // que está visível para não divergirem do grid.
  const statsAppts =
    period === "week" && weekProfessional
      ? appts.filter((a) => a.professional_id === weekProfessional.id)
      : appts;

  function openAppt(a: AppointmentRow) {
    setSheetAppt(a);
    setSheetOpen(true);
  }
  function openNew(professionalId: string | undefined, start?: Date) {
    setEditingAppt(null);
    setNewDefaults({ professionalId, start });
    setNewOpen(true);
  }
  function openEdit(a: AppointmentRow) {
    setSheetOpen(false);
    setEditingAppt(a);
    setNewOpen(true);
  }

  const fixedProfessionalId = scope === "self" ? selfPro?.id : undefined;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Agenda</h1>
        <Button onClick={() => openNew(fixedProfessionalId)}>
          <Plus className="h-4 w-4" /> Novo atendimento
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl bg-muted p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                period === p
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Anterior"
            onClick={() => setAnchor((a) => shiftPeriod(a, period, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próximo"
            onClick={() => setAnchor((a) => shiftPeriod(a, period, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm font-medium capitalize text-muted-foreground">
          {periodLabel(anchor, period)}
        </span>

        {scope === "all" && (
          <Select
            className="ml-auto w-48"
            value={filterProf}
            onChange={(e) => setFilterProf(e.target.value)}
            aria-label="Filtrar profissional"
          >
            <option value="all">Todas as profissionais</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <PeriodStats appointments={statsAppts} showRevenue={showRevenue} />

      {period === "week" && scope === "all" && weekProfessional && (
        <p className="-mb-1 text-sm">
          <span className="text-muted-foreground">Agenda de </span>
          <span className="font-medium">{weekProfessional.full_name}</span>
          {professionals.length > 1 && (
            <span className="text-muted-foreground">
              {" "}
              — troque no filtro acima
            </span>
          )}
        </p>
      )}

      <div className="rounded-2xl bg-card p-2 shadow-sm">
        {appointments.isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Carregando agenda…
          </p>
        ) : period === "day" ? (
          <DayView
            date={anchor}
            professionals={filteredProfessionals}
            appointments={appts}
            onSelect={openAppt}
            onEmptyClick={(pid, start) => openNew(pid, start)}
          />
        ) : period === "week" ? (
          weekProfessional ? (
            <WeekView
              anchor={anchor}
              color={weekProfessional.color}
              appointments={appts.filter(
                (a) => a.professional_id === weekProfessional.id,
              )}
              onSelect={openAppt}
              onEmptyClick={(start) => openNew(weekProfessional.id, start)}
            />
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Selecione uma profissional para ver a semana.
            </p>
          )
        ) : (
          <MonthView
            anchor={anchor}
            appointments={appts}
            onSelect={openAppt}
            onSelectDay={(d) => {
              setAnchor(d);
              setPeriod("day");
            }}
          />
        )}
      </div>

      <AppointmentSheet
        appointment={sheetAppt}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onEdit={openEdit}
      />
      <NewAppointmentDialog
        open={newOpen}
        onClose={() => {
          setNewOpen(false);
          setEditingAppt(null);
        }}
        professionals={professionals}
        services={services.data ?? []}
        defaults={newDefaults}
        fixedProfessionalId={fixedProfessionalId}
        editing={editingAppt}
      />
    </section>
  );
}
