import { Clock, Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { ServiceSheet } from "@/components/services/ServiceSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAllServices } from "@/hooks/useServiceAdmin";
import { formatBRL, formatMinutes } from "@/lib/format";
import type { Service } from "@/types/database";

export function ServicesPage() {
  const services = useAllServices();
  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);

  function openSheet(s: Service | null) {
    setEditing(s);
    setOpen(true);
  }

  const rows = services.data ?? [];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Serviços</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo do estúdio. O preço/duração aqui é o padrão — cada
            profissional pode ter o seu, ajustável na aba Equipe.
          </p>
        </div>
        <Button onClick={() => openSheet(null)}>
          <Plus className="h-4 w-4" /> Novo serviço
        </Button>
      </div>

      {services.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum serviço ainda. Use “Novo serviço” para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <Card key={s.id} className={s.active ? "" : "opacity-60"}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium leading-tight">{s.name}</p>
                    {!s.active && (
                      <span className="text-xs text-muted-foreground">
                        Inativo
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar"
                    onClick={() => openSheet(s)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="tnums text-lg font-semibold">
                    {formatBRL(s.price)}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatMinutes(s.duration_minutes)}
                  </span>
                </div>
                {s.commission_pct_override != null && (
                  <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    Comissão {s.commission_pct_override}%
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ServiceSheet
        service={editing}
        open={open}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}
