import { Hourglass } from "lucide-react";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import {
  IcAgenda,
  IcAppointments,
  IcBook,
  IcClients,
  IcFinance,
  IcHistory,
  IcHome,
  IcInsights,
  IcProfile,
  IcSchedule,
  IcServices,
  IcSettings,
  IcTeam,
} from "@/components/icons";
import { AppBoot } from "@/components/shared/AppBoot";
import { AppShell, type NavItem } from "@/components/shared/AppShell";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { homePathFor, useAuth } from "@/contexts/AuthContext";

/**
 * Cada tela é carregada só quando alguém abre.
 *
 * Antes tudo vinha num pacote único de 1 MB — a Kimberly baixava o gráfico
 * do Financeiro da gestora (que ela nem acessa) antes de ver a agenda dela.
 * Como as telas só entram pela navegação, o pedaço chega junto com o clique.
 */
const AgendaPage = lazy(() => import("@/components/agenda/AgendaPage").then((m) => ({ default: m.AgendaPage })));
const AvailabilityEditor = lazy(() => import("@/components/agenda/AvailabilityEditor").then((m) => ({ default: m.AvailabilityEditor })));
const ClientHome = lazy(() => import("@/pages/app/ClientHome").then((m) => ({ default: m.ClientHome })));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const ClientsPage = lazy(() => import("@/pages/admin/ClientsPage").then((m) => ({ default: m.ClientsPage })));
const FinancePage = lazy(() => import("@/pages/admin/FinancePage").then((m) => ({ default: m.FinancePage })));
const GoalsPage = lazy(() => import("@/pages/admin/GoalsPage").then((m) => ({ default: m.GoalsPage })));
const ProfessionalsPage = lazy(() => import("@/pages/admin/ProfessionalsPage").then((m) => ({ default: m.ProfessionalsPage })));
const ServicesPage = lazy(() => import("@/pages/admin/ServicesPage").then((m) => ({ default: m.ServicesPage })));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const AppointmentsPage = lazy(() => import("@/pages/shared/AppointmentsPage").then((m) => ({ default: m.AppointmentsPage })));
const HistoryPage = lazy(() => import("@/pages/shared/HistoryPage").then((m) => ({ default: m.HistoryPage })));
const InsightsPage = lazy(() => import("@/pages/shared/InsightsPage").then((m) => ({ default: m.InsightsPage })));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const InvitePage = lazy(() => import("@/pages/auth/InvitePage").then((m) => ({ default: m.InvitePage })));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const SignupPage = lazy(() => import("@/pages/auth/SignupPage").then((m) => ({ default: m.SignupPage })));
const ProFinancePage = lazy(() => import("@/pages/pro/FinancePage").then((m) => ({ default: m.ProFinancePage })));
const ProDashboard = lazy(() => import("@/pages/pro/ProDashboard").then((m) => ({ default: m.ProDashboard })));

const ADMIN_NAV: NavItem[] = [
  { to: "/admin/dashboard", label: "Início", icon: IcHome },
  { to: "/admin/insights", label: "Insights", icon: IcInsights },
  { to: "/admin/agenda", label: "Agenda", icon: IcAgenda },
  { to: "/admin/atendimentos", label: "Atendimentos", icon: IcAppointments },
  { to: "/admin/clientes", label: "Clientes", icon: IcClients },
  { to: "/admin/financeiro", label: "Financeiro", icon: IcFinance },
  { to: "/admin/profissionais", label: "Equipe", icon: IcTeam },
  { to: "/admin/servicos", label: "Serviços", icon: IcServices },
  { to: "/admin/historico", label: "Histórico", icon: IcHistory },
  { to: "/admin/configuracoes", label: "Ajustes", icon: IcSettings },
];

const PRO_NAV: NavItem[] = [
  { to: "/pro/dashboard", label: "Início", icon: IcHome },
  { to: "/pro/insights", label: "Insights", icon: IcInsights },
  { to: "/pro/agenda", label: "Agenda", icon: IcAgenda },
  { to: "/pro/disponibilidade", label: "Horários", icon: IcSchedule },
  { to: "/pro/clientes", label: "Clientes", icon: IcClients },
  { to: "/pro/servicos", label: "Serviços", icon: IcServices },
  { to: "/pro/financeiro", label: "Financeiro", icon: IcFinance },
  { to: "/pro/historico", label: "Histórico", icon: IcHistory },
];

const SECRETARY_NAV: NavItem[] = [
  { to: "/secretaria/agenda", label: "Agenda", icon: IcAgenda },
  { to: "/secretaria/atendimentos", label: "Atendimentos", icon: IcAppointments },
  { to: "/secretaria/clientes", label: "Clientes", icon: IcClients },
  { to: "/secretaria/disponibilidade", label: "Horários", icon: IcSchedule },
  { to: "/secretaria/servicos", label: "Serviços", icon: IcServices },
];

const CLIENT_NAV: NavItem[] = [
  { to: "/app/agendar", label: "Agendar", icon: IcBook },
  { to: "/app/meus-horarios", label: "Horários", icon: IcSchedule },
  { to: "/app/perfil", label: "Perfil", icon: IcProfile },
];

function RootRedirect() {
  const { session, profile, loading } = useAuth();
  if (loading) return null;
  if (!session || !profile) return <Navigate to="/login" replace />;
  return <Navigate to={homePathFor(profile.role)} replace />;
}

function ComingSoon({ title }: { title: string }) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="flex flex-col items-center gap-3 rounded-card bg-card p-12 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-tint)]">
          <Hourglass className="h-7 w-7 text-brand" />
        </span>
        <p className="max-w-xs text-sm text-muted-foreground">
          Estamos preparando esta área — ela chega em breve.
        </p>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <Suspense fallback={<AppBoot />}>
      <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />

      {/* GESTORA */}
      <Route element={<ProtectedRoute roles={["owner"]} />}>
        <Route element={<AppShell items={ADMIN_NAV} />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/insights" element={<InsightsPage />} />
          <Route
            path="/admin/agenda"
            element={<AgendaPage scope="all" showRevenue />}
          />
          <Route path="/admin/clientes" element={<ClientsPage />} />
          <Route
            path="/admin/disponibilidade"
            element={<AvailabilityEditor scope="all" />}
          />
          <Route path="/admin/atendimentos" element={<AppointmentsPage />} />
          <Route path="/admin/financeiro" element={<FinancePage />} />
          <Route path="/admin/profissionais" element={<ProfessionalsPage />} />
          <Route path="/admin/metas" element={<GoalsPage />} />
          <Route path="/admin/servicos" element={<ServicesPage />} />
          <Route path="/admin/historico" element={<HistoryPage scope="all" />} />
          <Route path="/admin/configuracoes" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* PROFISSIONAL */}
      <Route element={<ProtectedRoute roles={["professional"]} />}>
        <Route element={<AppShell items={PRO_NAV} />}>
          <Route path="/pro" element={<Navigate to="/pro/dashboard" replace />} />
          <Route path="/pro/dashboard" element={<ProDashboard />} />
          <Route path="/pro/insights" element={<InsightsPage />} />
          <Route
            path="/pro/agenda"
            element={<AgendaPage scope="self" showRevenue={false} />}
          />
          <Route
            path="/pro/disponibilidade"
            element={<AvailabilityEditor scope="self" />}
          />
          <Route path="/pro/clientes" element={<ClientsPage />} />
          <Route path="/pro/servicos" element={<ServicesPage />} />
          <Route path="/pro/financeiro" element={<ProFinancePage />} />
          {/* rota antiga: links e favoritos salvos continuam funcionando */}
          <Route path="/pro/ganhos" element={<Navigate to="/pro/financeiro" replace />} />
          <Route path="/pro/historico" element={<HistoryPage scope="self" />} />
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
          <Route path="/secretaria/atendimentos" element={<AppointmentsPage />} />
          <Route path="/secretaria/clientes" element={<ClientsPage />} />
          <Route path="/secretaria/servicos" element={<ServicesPage />} />
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
    </Suspense>
  );
}
