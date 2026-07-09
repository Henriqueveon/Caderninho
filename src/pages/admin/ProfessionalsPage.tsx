import { Mail, Pencil, Phone, Scissors, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

import { InviteSheet } from "@/components/team/InviteSheet";
import { ProfessionalSheet } from "@/components/team/ProfessionalSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useServices } from "@/hooks/useAgenda";
import {
  type TeamMember,
  useInvites,
  useRevokeInvite,
  useTeam,
} from "@/hooks/useTeam";

const ROLE_LABEL: Record<string, string> = {
  professional: "Profissional",
  secretary: "Secretária",
};

export function ProfessionalsPage() {
  const team = useTeam();
  const services = useServices();
  const invites = useInvites();
  const revoke = useRevokeInvite();

  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  function edit(m: TeamMember) {
    setEditing(m);
    setEditOpen(true);
  }

  const members = team.data ?? [];
  const serviceName = (id: string) =>
    services.data?.find((s) => s.id === id)?.name ?? "";

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Equipe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Parceiras do estúdio, comissões e serviços.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Convidar
        </Button>
      </div>

      {team.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando equipe…</p>
      ) : team.error ? (
        <p className="text-sm text-destructive">
          Não foi possível carregar a equipe.
        </p>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma profissional ainda. Use “Convidar” para adicionar a primeira.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Card
              key={m.professional_id}
              className={m.active ? "" : "opacity-60"}
            >
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.full_name.slice(0, 1)}
                    </span>
                    <div>
                      <p className="font-medium leading-tight">{m.full_name}</p>
                      {!m.active && (
                        <span className="text-xs text-muted-foreground">
                          Inativa
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar"
                    onClick={() => edit(m)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                <dl className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{m.email}</span>
                  </div>
                  {m.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{m.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Scissors className="h-3.5 w-3.5" />
                    <span>
                      {m.service_ids.length}{" "}
                      {m.service_ids.length === 1 ? "serviço" : "serviços"}
                    </span>
                  </div>
                </dl>

                <div className="flex items-center justify-between border-t pt-3 text-sm">
                  <span className="text-muted-foreground">Comissão</span>
                  <span className="tnums font-semibold text-primary">
                    {m.commission_pct}%
                  </span>
                </div>

                {m.service_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {m.service_ids.slice(0, 3).map((sid) => (
                      <span
                        key={sid}
                        className="rounded-full bg-muted px-2 py-0.5 text-[11px]"
                      >
                        {serviceName(sid)}
                      </span>
                    ))}
                    {m.service_ids.length > 3 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                        +{m.service_ids.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Convites pendentes */}
      {(invites.data ?? []).length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Convites pendentes
          </h2>
          <ul className="flex flex-col gap-2">
            {invites.data!.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between rounded-xl bg-card px-4 py-3 text-sm shadow-sm"
              >
                <div>
                  <span className="font-medium">{inv.full_name ?? inv.email}</span>
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {ROLE_LABEL[inv.role] ?? inv.role}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {inv.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `${window.location.origin}/invite/${inv.token}`,
                      )
                    }
                  >
                    Copiar link
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Revogar convite"
                    onClick={() => revoke.mutate(inv.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ProfessionalSheet
        member={editing}
        services={services.data ?? []}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </section>
  );
}
