import { CalendarClock, Phone, Search, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

import { ClientSheet } from "@/components/clients/ClientSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type ClientStat, attendanceRate, useClients } from "@/hooks/useClients";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ClientsPage() {
  const clients = useClients();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ClientStat | null>(null);
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const list = clients.data ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (c) =>
            c.full_name.toLowerCase().includes(q) ||
            (c.phone ?? "").includes(q),
        )
      : list;
    // mais recorrentes primeiro
    return [...filtered].sort((a, b) => b.done - a.done);
  }, [clients.data, query]);

  function openSheet(c: ClientStat | null) {
    setEditing(c);
    setOpen(true);
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recorrência, visitas e presença de cada cliente.
          </p>
        </div>
        <Button onClick={() => openSheet(null)}>
          <UserPlus className="h-4 w-4" /> Nova cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Buscar por nome ou telefone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {clients.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando clientes…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {query
              ? "Nenhuma cliente encontrada."
              : "Nenhuma cliente cadastrada. Use “Nova cliente” para começar."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => {
            const rate = attendanceRate(c);
            return (
              <button
                key={c.id}
                onClick={() => openSheet(c)}
                className="rounded-card bg-card p-4 text-left shadow-card transition-shadow hover:shadow-float"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
                    {c.full_name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.full_name}</p>
                    {c.phone && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="tnums text-lg font-semibold">{c.done}</p>
                    <p className="text-[11px] text-muted-foreground">visitas</p>
                  </div>
                  <div>
                    <p className="tnums text-lg font-semibold">
                      {rate === null ? "—" : `${Math.round(rate * 100)}%`}
                    </p>
                    <p className="text-[11px] text-muted-foreground">presença</p>
                  </div>
                  <div>
                    <p className="tnums text-lg font-semibold text-primary">
                      {c.upcoming}
                    </p>
                    <p className="text-[11px] text-muted-foreground">próximos</p>
                  </div>
                </div>

                {c.last_visit && (
                  <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    última visita{" "}
                    {formatDistanceToNow(new Date(c.last_visit), {
                      locale: ptBR,
                      addSuffix: true,
                    })}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      <ClientSheet client={editing} open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
