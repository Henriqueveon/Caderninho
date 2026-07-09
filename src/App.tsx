import {
  BarChart3,
  Calendar,
  CalendarClock,
  CalendarPlus,
  History,
  LayoutDashboard,
  Scissors,
  Settings,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell, type NavItem } from "@/components/shared/AppShell";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { AgendaPage } from "@/components/agenda/AgendaPage";
import { AvailabilityEditor } from "@/components/agenda/AvailabilityEditor";
import { homePathFor, useAuth } from "@/contexts/AuthContext";
import { ClientHome } from "@/pages/app/ClientHome";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { FinancePage } from "@/pages/admin/FinancePage";
import { GoalsPage } from "@/pages/admin/GoalsPage";
import { ProfessionalsPage } from "@/pages/admin/ProfessionalsPage";
import { ServicesPage } from "@/pages/admin/ServicesPage";
import { InvitePage } from "@/pages/auth/InvitePage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { EarningsPage } from "@/pages/pro/EarningsPage";
import { ProDashboard } from "@/pages/pro/ProDashboard";

const ADMIN_NAV: NavItem[] = [
  { to: "/admin/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/admin/agenda", label: "Agenda", icon: Calendar },
  { to: "/admin/financeiro", label: "Financeiro", icon: BarChart3 },
  { to: "/admin/profissionais", label: "Equipe", icon: Users },
  { to: "/admin/servicos", label: "Serviços", icon: Scissors },
  { to: "/admin/configuracoes", label: "Ajustes", icon: Settings },
];

const PRO_NAV: NavItem[] = [
  { to: "/pro/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/pro/agenda", label: "Agenda", icon: Calendar },
  { to: "/pro/disponibilidade", label: "Horários", icon: CalendarClock },
  { to: "/pro/ganhos", label: "Ganhos", icon: Wallet },
  { to: "/pro/historico", label: "Histórico", icon: History },
];

const SECRETARY_NAV: NavItem[] = [
  { to: "/secretaria/agenda", label: "Agenda", icon: Calendar },
  { to: "/secretaria/disponibilidade", label: "Horários", icon: CalendarClock },
];

const CLIENT_NAV: NavItem[] = [
  { to: "/app/agendar", label: "Agendar", icon: CalendarPlus },
  { to: "/app/meus-horarios", label: "Horários", icon: Calendar },
  { to: "/app/perfil", label: "Perfil", icon: User },
];

function RootRedirect() {
  const { session, profile, loading } = useAuth();
  if (loading) return null;
  if (!session || !profile) return <Navigate to="/login" replace />;
  return <Navigate to={homePathFor(profile.role)} replace />;
}

function ComingSoon({ title }: { title: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Esta tela chega nas próximas fases do MVP.
      </p>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />

      {/* GESTORA */}
      <Route element={<ProtectedRoute roles={["owner"]} />}>
        <Route element={<AppShell items={ADMIN_NAV} />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route
            path="/admin/agenda"
            element={<AgendaPage scope="all" showRevenue />}
          />
          <Route
            path="/admin/disponibilidade"
            element={<AvailabilityEditor scope="all" />}
          />
          <Route path="/admin/atendimentos" element={<ComingSoon title="Atendimentos" />} />
          <Route path="/admin/financeiro" element={<FinancePage />} />
          <Route path="/admin/profissionais" element={<ProfessionalsPage />} />
          <Route path="/admin/metas" element={<GoalsPage />} />
          <Route path="/admin/servicos" element={<ServicesPage />} />
          <Route path="/admin/historico" element={<ComingSoon title="Histórico" />} />
          <Route path="/admin/configuracoes" element={<ComingSoon title="Configurações" />} />
        </Route>
      </Route>

      {/* PROFISSIONAL */}
      <Route element={<ProtectedRoute roles={["professional"]} />}>
        <Route element={<AppShell items={PRO_NAV} />}>
          <Route path="/pro" element={<Navigate to="/pro/dashboard" replace />} />
          <Route path="/pro/dashboard" element={<ProDashboard />} />
          <Route
            path="/pro/agenda"
            element={<AgendaPage scope="self" showRevenue={false} />}
          />
          <Route
            path="/pro/disponibilidade"
            element={<AvailabilityEditor scope="self" />}
          />
          <Route path="/pro/ganhos" element={<EarningsPage />} />
          <Route path="/pro/historico" element={<ComingSoon title="Histórico" />} />
        </Route>
      </Route>

      {/* SECRETÁRIA — todas as agendas, sem faturamento */}
      <Route element={<ProtectedRoute roles={["secretary"]} />}>
        <Route element={<AppShell items={SECRETARY_NAV} />}>
          <Route path="/secretaria" element={<Navigate to="/secretaria/agenda" replace />} />
          <Route
            path="/secretaria/agenda"
            element={<AgendaPage scope="all" showRevenue={false} />}
          />
          <Route
            path="/secretaria/disponibilidade"
            element={<AvailabilityEditor scope="all" />}
          />
        </Route>
      </Route>

      {/* CLIENTE */}
      <Route element={<ProtectedRoute roles={["client"]} />}>
        <Route element={<AppShell items={CLIENT_NAV} />}>
          <Route path="/app" element={<Navigate to="/app/agendar" replace />} />
          <Route path="/app/agendar" element={<ClientHome />} />
          <Route path="/app/meus-horarios" element={<ComingSoon title="Meus horários" />} />
          <Route path="/app/perfil" element={<ComingSoon title="Meu perfil" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
