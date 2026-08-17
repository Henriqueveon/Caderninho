import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { GoalBar } from "@/components/insights/GoalBar";
import { HomeHero } from "@/components/insights/HomeHero";
import { Panel } from "@/components/insights/Panel";
import { SectionLabel } from "@/components/insights/SectionLabel";
import { StatTile } from "@/components/insights/StatTile";
import { UpcomingList } from "@/components/insights/UpcomingList";
import { ColumnChart } from "@/components/insights/ColumnChart";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfessional } from "@/hooks/useAgenda";
import { useInsights } from "@/hooks/useInsights";

import { formatBRLShort } from "@/lib/format";

const compactBRL = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}k` : n.toFixed(0);

function SeeAll({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-0.5 text-[11px] font-medium text-brand"
    >
      {children} <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

export function ProDashboard() {
  const { profile } = useAuth();
  const myPro = useMyProfessional();
  const ins = useInsights(myPro.data?.id);
  const firstName = profile?.full_name.split(" ")[0];

  return (
    <section className="flex flex-col gap-7">
      <HomeHero
        name={firstName}
        isOwner={false}
        total={ins.total}
        deltaPct={ins.deltaPct}
        guaranteed={ins.guaranteed}
        monthTotal={ins.monthTotal}
        streak={ins.streak}
        periodLabel={ins.periodLabel}
        loading={ins.isLoading}
      />

      <div className="grid grid-cols-3 divide-x divide-rule rounded-[16px] border border-rule bg-card">
        <StatTile label="Hoje" value={String(ins.today.total)} caption={`${ins.today.remaining} a atender`} />
        <StatTile label="Concluídos" value={String(ins.today.done)} caption="hoje" accent="text-success" />
        <StatTile label="A receber" value={formatBRLShort(ins.today.toReceive)} caption="hoje" accent="text-brand" />
      </div>

      {ins.goal && (
        <Panel className="p-4">
          <GoalBar
            pct={ins.goal.pct}
            current={ins.goal.current}
            target={ins.goal.target}
            type={ins.goal.type}
          />
        </Panel>
      )}

      <div>
        <SectionLabel right={<SeeAll to="/pro/insights">Ver insights</SeeAll>}>
          Sua semana
        </SectionLabel>
        <Panel className="p-4">
          <ColumnChart data={ins.series} formatValue={compactBRL} label="Semana" />
        </Panel>
      </div>

      <div>
        <SectionLabel right={<SeeAll to="/pro/agenda">Ver agenda</SeeAll>}>
          Próximos
        </SectionLabel>
        <Panel className="px-4">
          <UpcomingList
            appointments={ins.upcoming}
            color={() => myPro.data?.color ?? "var(--primary)"}
          />
        </Panel>
      </div>

      <Link
        to="/pro/insights"
        className="flex items-center justify-center gap-2 rounded-[14px] border border-rule py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-brand"
      >
        Ver todos os meus insights <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
