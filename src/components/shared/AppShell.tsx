import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Moon, Sun } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { pageVariants } from "@/lib/motion";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export interface NavItem {
  to: string;
  label: string;
  /** Aceita tanto os ícones autorais quanto os do Lucide — os dois são
   *  componentes SVG que recebem className. */
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Gestora",
  professional: "Profissional",
  secretary: "Secretária",
  client: "Cliente",
};

export function AppShell({ items }: { items: NavItem[] }) {
  const { profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar desktop */}
      <header className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/60 p-5 md:flex">
        <div className="mb-8 px-1">
          <Logo size={34} />
        </div>

        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-colors duration-[var(--dur-instant)]",
                  isActive
                    ? "text-brand"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* A pílula ativa é UM elemento que se move entre os itens —
                      dá continuidade espacial: você vê para onde foi. */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-2xl bg-[var(--primary-tint)]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <item.icon className="relative h-5 w-5" aria-hidden="true" />
                  <span className="relative">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
          <div className="mb-1 flex items-center gap-3 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
              {profile?.full_name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABEL[profile?.role ?? ""] ?? ""}
              </p>
            </div>
          </div>
          <button
            onClick={toggle}
            className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            {theme === "dark" ? "Tema claro" : "Tema escuro"}
          </button>
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Sair
          </button>
        </div>
      </header>

      {/* Topbar mobile */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-3 md:hidden">
        <Logo size={30} />
        <button
          onClick={toggle}
          aria-label="Alternar tema"
          className="rounded-full p-2 text-muted-foreground hover:bg-secondary"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Conteúdo */}
      <main className="flex-1 pb-24 md:pb-0">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          {/* mode="wait" para a tela nova não entrar por cima da antiga */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Barra inferior mobile */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-10 flex overflow-x-auto border-t border-border bg-card/90 px-1 py-1 backdrop-blur-md [&::-webkit-scrollbar]:hidden md:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "relative flex min-h-[52px] flex-1 shrink-0 basis-[64px] flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[10px] font-medium transition-colors",
                isActive ? "text-brand" : "text-muted-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-dash"
                    className="absolute top-0 h-[3px] w-7 rounded-b-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
