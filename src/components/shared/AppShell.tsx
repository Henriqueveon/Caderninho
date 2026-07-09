import type { LucideIcon } from "lucide-react";
import { LogOut, Moon, Sun } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
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
                  "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-[var(--primary-tint)] text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
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
          <Outlet />
        </div>
      </main>

      {/* Barra inferior mobile */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-card/90 px-1 py-1 backdrop-blur-md md:hidden"
      >
        {items.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
