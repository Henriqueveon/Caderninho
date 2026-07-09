import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Shell compartilhado das três áreas: sidebar no desktop,
 * barra inferior no mobile (uso majoritário é pelo celular).
 */
export function AppShell({ items }: { items: NavItem[] }) {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar desktop */}
      <header className="hidden w-60 shrink-0 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-8 px-2">
          <span className="text-lg font-semibold text-primary">Caderninho</span>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {profile?.full_name}
          </p>
        </div>
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => void signOut()}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Sair
        </button>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Barra inferior mobile */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-card md:hidden"
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex min-h-[44px] flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
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
