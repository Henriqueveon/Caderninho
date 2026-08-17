// Página temporária de comparação — não entra no menu nem no build final.
import {
  BarChart3, Calendar, CalendarClock, CalendarPlus, ClipboardList, Contact,
  History, LayoutDashboard, Scissors, Settings, User, Users,
} from "lucide-react";

import {
  IcAgenda, IcAppointments, IcBook, IcClients, IcFinance, IcHistory, IcHome,
  IcInsights, IcProfile, IcSchedule, IcServices, IcSettings, IcTeam,
} from "@/components/icons";

const PARES = [
  ["Início", LayoutDashboard, IcHome],
  ["Insights", BarChart3, IcInsights],
  ["Agenda", Calendar, IcAgenda],
  ["Atendimentos", ClipboardList, IcAppointments],
  ["Clientes", Contact, IcClients],
  ["Financeiro", BarChart3, IcFinance],
  ["Equipe", Users, IcTeam],
  ["Serviços", Scissors, IcServices],
  ["Histórico", History, IcHistory],
  ["Ajustes", Settings, IcSettings],
  ["Horários", CalendarClock, IcSchedule],
  ["Agendar", CalendarPlus, IcBook],
  ["Perfil", User, IcProfile],
] as const;

export function IconLab() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-title">Ícones — atual x autoral</h1>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PARES.map(([label, Old, New]) => (
          <div key={label} className="flex items-center gap-4 rounded-card border border-border bg-card p-4">
            <div className="flex flex-col items-center gap-1">
              <Old className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">antes</span>
            </div>
            <span className="h-8 w-px bg-rule" />
            <div className="flex flex-col items-center gap-1">
              <New className="h-6 w-6 text-brand" />
              <span className="text-[10px] text-brand">novo</span>
            </div>
            <span className="ml-2 text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>
      <div className="rounded-card border border-border bg-card p-6">
        <p className="kicker mb-4">Como fica no menu</p>
        <div className="flex max-w-[240px] flex-col gap-1.5">
          {PARES.slice(0, 6).map(([label, , New], i) => (
            <div key={label} className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium ${i === 1 ? "bg-[var(--primary-tint)] text-brand" : "text-muted-foreground"}`}>
              <New className="h-5 w-5" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
