import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppointmentSheet } from "@/components/agenda/AppointmentSheet";
import { NewAppointmentDialog } from "@/components/agenda/NewAppointmentDialog";
import { STATUS_META } from "@/components/agenda/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  type AppointmentRow,
  useAppointments,
  useProfessionals,
  useServices,
} from "@/hooks/useAgenda";
import { METHOD_LABEL } from "@/hooks/usePayments";
import {
  PERIOD_LABELS,
  type Period,
  periodLabel,
  periodRange,
  shiftPeriod,
  timeLabel,
} from "@/lib/dates";
import { downloadCSV } from "@/lib/finance";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PERIODS: Period[] = ["week", "month", "quarter"];
const STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "in_progress",
  "done",
  "no_show",
  "canceled",
];

export function AppointmentsPage() {
  const { profile } = useAuth();
  const canSeeRevenue = profile?.role !== "secretary";

  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [prof, setProf] = useState("all");
  const [status, setStatus] = useState<AppointmentStatus | "all">("all");
  const [service, setService] = useState("all");
  const [query, setQuery] = useState("");
  const [sheetAppt, setSheetAppt] = useState<AppointmentRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<AppointmentRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const range = useMemo(() => periodRange(anchor, period), [anchor, period]);
  const appointments = useAppointments(range, prof === "all" ? undefined : prof);
  const professionals = useProfessionals();
  const services = useServices();

  const proName = (id: string) =>
    professionals.data?.find((p) => p.id === id)?.full_name ?? "—";
  const proColor = (id: string) =>
    professionals.data?.find((p) => p.id === id)?.color ?? "#B76E79";

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (appointments.data ?? [])
      .filter((a) => status === "all" || a.status === status)
      .filter((a) => service === "all" || a.service_id === service)
      .filter(
        (a) =>
          !q || (a.client_name_snapshot ?? "").toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          new Date(b.scheduled_start).getTime() -
          new Date(a.scheduled_start).getTime(),
      );
  }, [appointments.data, status, service, query]);

  const doneValue = rows
    .filter((a) => a.status === "done")
    .reduce((s, a) => s + a.price_snapshot, 0);

  function exportCSV() {
    const money = (n: number) => n.toFixed(2).replace(".", ",");
    const header = ["Data", "Hora", "Cliente", "Profissional", "Servico", "Status"];
    if (canSeeRevenue) header.push("Valor", "Forma pgto");
    const body = rows.map((a) => {
      const line = [
        format(new Date(a.scheduled_start), "dd/MM/yyyy"),
        timeLabel(a.scheduled_start),
        a.client_name_snapshot ?? "",
        proName(a.professional_id),
        a.service?.name ?? "",
        STATUS_META[a.status].label,
      ];
      if (canSeeRevenue)
        line.push(
          money(a.price_snapshot),
          a.payment_method ? METHOD_LABEL[a.payment_method] : "",
        );
      return line;
    });
    const csv =
      "﻿" + [header, ...body].map((c) => c.join(";")).join("\r\n");
    downloadCSV(
      `atendimentos-${periodLabel(anchor, period).replace(/[^\w]+/g, "-")}.csv`,
      csv,
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Atendimentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Histórico completo, com filtros.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportCSV}
          disabled={rows.length === 0}
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* Período */}
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
          <Button variant="outline" size="icon" aria-label="Anterior"
            onClick={() => setAnchor((a) => shiftPeriod(a, period, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            Atual
          </Button>
          <Button variant="outline" size="icon" aria-label="Próximo"
            onClick={() => setAnchor((a) => shiftPeriod(a, period, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm font-medium capitalize text-muted-foreground">
          {periodLabel(anchor, period)}
        </span>
      </div>

      {/* Filtros */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={prof} onChange={(e) => setProf(e.target.value)} aria-label="Profissional">
          <option value="all">Todas as profissionais</option>
          {(professionals.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as AppointmentStatus | "all")}
          aria-label="Status"
        >
          <option value="all">Todos os status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </Select>
        <Select value={service} onChange={(e) => setService(e.target.value)} aria-label="Serviço">
          <option value="all">Todos os serviços</option>
          {(services.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Buscar cliente…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Resumo */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span>
          <span className="tnums font-semibold">{rows.length}</span>{" "}
          <span className="text-muted-foreground">atendimentos</span>
        </span>
        {canSeeRevenue && (
          <span>
            <span className="text-muted-foreground">concluídos somam </span>
            <span className="tnums font-semibold text-primary">
              {formatBRL(doneValue)}
            </span>
          </span>
        )}
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {appointments.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhum atendimento com esses filtros.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((a) => {
                const meta = STATUS_META[a.status];
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => {
                        setSheetAppt(a);
                        setSheetOpen(true);
                      }}
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/50"
                    >
                      <div className="w-16 shrink-0">
                        <p className="text-sm font-medium">
                          {format(new Date(a.scheduled_start), "dd/MM", {
                            locale: ptBR,
                          })}
                        </p>
                        <p className="tnums text-xs text-muted-foreground">
                          {timeLabel(a.scheduled_start)}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {a.client_name_snapshot ?? "—"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          <span
                            className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                            style={{ backgroundColor: proColor(a.professional_id) }}
                          />
                          {proName(a.professional_id)}
                          {a.service?.name ? ` · ${a.service.name}` : ""}
                        </p>
                      </div>
                      {canSeeRevenue && (
                        <span className="hidden shrink-0 flex-col items-end sm:flex">
                          <span className="tnums text-sm font-medium">
                            {formatBRL(a.price_snapshot)}
                          </span>
                          {a.status === "done" && a.payment_method && (
                            <span className="text-[11px] text-muted-foreground">
                              {METHOD_LABEL[a.payment_method]}
                            </span>
                          )}
                        </span>
                      )}
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <AppointmentSheet
        appointment={sheetAppt}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onEdit={(a) => {
          setSheetOpen(false);
          setEditingAppt(a);
          setEditOpen(true);
        }}
      />
      <NewAppointmentDialog
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingAppt(null);
        }}
        professionals={professionals.data ?? []}
        services={services.data ?? []}
        defaults={{}}
        editing={editingAppt}
      />
    </section>
  );
}
