import { Clock, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ServiceSheet } from "@/components/services/ServiceSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useAllServices } from "@/hooks/useServiceAdmin";
import { formatBRL, formatMinutes } from "@/lib/format";
import { groupServices, isFree, priceLabel } from "@/lib/service-groups";
import type { Service } from "@/types/database";

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function ServicesPage() {
  const { profile } = useAuth();
  const isOwner = profile?.role === "owner";
  const services = useAllServices();
  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function openSheet(s: Service | null) {
    setEditing(s);
    setOpen(true);
  }

  const rows = services.data ?? [];
  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const filtered = q ? rows.filter((s) => normalize(s.name).includes(q)) : rows;
    return groupServices(filtered);
  }, [rows, query]);

  const total = rows.length;
  const shown = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Serviços</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {isOwner
              ? "Catálogo do estúdio. O preço/duração aqui é o padrão — cada profissional pode ter o seu, ajustável na aba Equipe."
              : "Catálogo do estúdio. Você pode criar e ajustar serviços — toda alteração fica registrada no Histórico com o seu nome."}
          </p>
        </div>
        <Button onClick={() => openSheet(null)}>
          <Plus className="h-4 w-4" aria-hidden /> Novo serviço
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Buscar em ${total} serviços…`}
          aria-label="Buscar serviço"
          className="pl-10"
        />
      </div>

      {services.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : shown === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium">
              {query ? "Nenhum serviço com esse nome." : "Nenhum serviço ainda."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query
                ? "Tente outra busca ou limpe o campo."
                : "Use “Novo serviço” para começar o catálogo."}
            </p>
          </CardContent>
        </Card>
      ) : (
        groups.map(({ group, items }) => (
          <section key={group.key} aria-labelledby={`grp-${group.key}`}>
            <div className="mb-3 flex items-center gap-3">
              <h2 id={`grp-${group.key}`} className="kicker shrink-0">
                {group.label}
              </h2>
              <span className="h-px flex-1 bg-rule" />
              <span className="kicker shrink-0">{items.length}</span>
            </div>

            {/* items-stretch + h-full: o selo de comissão existe só em alguns
                cartões, e sem isso ele empurrava a altura e deixava a grade
                com buracos. */}
            <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openSheet(s)}
                  aria-label={`Editar ${s.name}`}
                  className={[
                    "group h-full cursor-pointer rounded-card border border-border bg-card p-4 text-left",
                    "shadow-[var(--sheen),var(--shadow-soft)]",
                    "transition-[transform,box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)]",
                    "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--sheen),var(--shadow-float)]",
                    "active:translate-y-0 active:duration-[var(--dur-instant)]",
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]",
                    s.active ? "" : "opacity-60",
                  ].join(" ")}
                >
                  <div className="flex h-full flex-col">
                    <p className="font-medium leading-snug">{s.name}</p>

                    <div className="mt-1 flex min-h-[20px] flex-wrap items-center gap-1.5">
                      {!s.active && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                          Inativo
                        </span>
                      )}
                      {s.commission_pct_override != null && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                          Comissão {s.commission_pct_override}%
                        </span>
                      )}
                    </div>

                    {/* mt-auto prende o preço no rodapé: todos os cartões da
                        linha alinham o valor na mesma altura. */}
                    <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                      {isFree(s.price) ? (
                        <span className="rounded-full bg-[var(--primary-tint)] px-2.5 py-1 text-xs font-medium text-brand">
                          {priceLabel(s.price, s.name)}
                        </span>
                      ) : (
                        <span className="figure text-lg font-semibold">
                          {formatBRL(s.price)}
                        </span>
                      )}
                      <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {formatMinutes(s.duration_minutes)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      <ServiceSheet service={editing} open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
