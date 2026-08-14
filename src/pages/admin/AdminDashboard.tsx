import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { BarList } from "@/components/insights/BarList";
import { HomeHero } from "@/components/insights/HomeHero";
import { Panel } from "@/components/insights/Panel";
import { SectionLabel } from "@/components/insights/SectionLabel";
import { StatTile } from "@/components/insights/StatTile";
import { UpcomingList } from "@/components/insights/UpcomingList";
import { WeekColumns } from "@/components/insights/WeekColumns";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessionals } from "@/hooks/useAgenda";
import { useInsights } from "@/hooks/useInsights";
import { businessWeekLabel } from "@/lib/dates";
import { formatBRL, formatBRLShort } from "@/lib/format";

const compactBRL = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}k` : n.toFixed(0);

function SeeAll({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary"
    >
      {children} <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

export function AdminDashboard() {
  const { profile } = useAuth();
  const ins = useInsights(undefined);
  const pros = useProfessionals();
  const firstName = profile?.full_name.split(" ")[0];
  const colorOf = (id: string) =>
    pros.data?.find((p) => p.id === id)?.color ?? "var(--primary)";

  return (
    <section className="flex flex-col gap-7">
      <HomeHero
        name={firstName}
        isOwner
        weekTotal={ins.weekTotal}
        weekDeltaPct={ins.weekDeltaPct}
        weekGuaranteed={ins.weekGuaranteed}
        monthTotal={ins.monthTotal}
        streak={ins.streak}
        weekLabel={businessWeekLabel(new Date())}
        loading={ins.isLoading}
      />

      <div className="grid grid-cols-3 divide-x divide-rule rounded-[16px] border border-rule bg-card">
        <StatTile label="Hoje" value={String(ins.today.total)} caption={`${ins.today.remaining} a atender`} />
        <StatTile label="Concluídos" value={String(ins.today.done)} caption="hoje" accent="text-success" />
        <StatTile label="Entrando" value={formatBRLShort(ins.today.toReceive)} caption="hoje" accent="text-primary" />
      </div>

      <div>
        <SectionLabel right={<SeeAll to="/admin/insights">Ver insights</SeeAll>}>
          Semana do estúdio
        </SectionLabel>
        <Panel className="p-4">
          <WeekColumns data={ins.weekDays} formatValue={compactBRL} />
        </Panel>
      </div>

      {ins.team && ins.team.some((t) => t.value > 0) && (
        <div>
          <SectionLabel>Equipe nesta semana</SectionLabel>
          <Panel className="p-4">
            <BarList
              rows={ins.team.map((t, i) => ({
                key: t.id,
                label: t.name,
                value: t.value,
                caption: `${t.count} atend.`,
                color: t.color,
                highlight: i === 0,
                leading: (
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                ),
              }))}
              formatValue={formatBRL}
            />
          </Panel>
        </div>
      )}

      <div>
        <SectionLabel right={<SeeAll to="/admin/agenda">Ver agenda</SeeAll>}>
          Próximos
        </SectionLabel>
        <Panel className="px-4">
          <UpcomingList appointments={ins.upcoming} color={colorOf} />
        </Panel>
      </div>

      <Link
        to="/admin/insights"
        className="flex items-center justify-center gap-2 rounded-[14px] border border-rule py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        Ver todos os insights do estúdio <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
