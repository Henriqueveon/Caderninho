import { AnimatePresence, motion } from "framer-motion";
import { Suspense } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
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

/** Espera do conteúdo: mesma forma de sempre — cabeçalho, fichas, painel. */
function ConteudoCarregando() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2.5 h-7 w-48" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-card" />
    </div>
  );
}

export function AppShell({ items }: { items: NavItem[] }) {
  const { profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar desktop */}
      <header className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/60 p-5 md:flex">
        <div className="mb-8 px-1">
          <Logo size={38} />
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
                      className="textured absolute inset-0 rounded-2xl border border-primary/20 bg-[var(--primary-tint)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
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
        <Logo size={32} />
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
              {/* Fronteira própria: com as telas carregadas sob demanda, sem
                  isto o Suspense de cima trocaria o app inteiro pelo esqueleto
                  de abertura a cada clique no menu. Aqui só o conteúdo espera —
                  o menu e a marca ficam de pé. */}
              <Suspense fallback={<ConteudoCarregando />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Barra inferior mobile */}
      <nav
        aria-label="Principal"
        className="textured fixed inset-x-0 bottom-0 z-10 flex overflow-x-auto border-t border-border bg-card/92 px-1.5 py-1.5 shadow-[0_-2px_10px_rgba(74,48,52,0.06),0_-12px_32px_rgba(74,48,52,0.06)] backdrop-blur-md [&::-webkit-scrollbar]:hidden md:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                // Cada aba é um azulejo: textura própria, borda de material e
                // uma luz no topo. A ativa afunda um fio e fica com o tom da
                // marca — o dedo sente onde está sem precisar ler.
                "textured relative mx-0.5 flex min-h-[52px] flex-1 shrink-0 basis-[62px] flex-col items-center justify-center gap-1",
                "rounded-2xl border py-1.5 text-[10px] font-medium",
                "transition-[background-color,border-color,color,box-shadow] duration-[var(--dur-instant)]",
                isActive
                  ? "border-primary/25 bg-[var(--primary-tint)] text-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_2px_rgba(74,48,52,0.06)]"
                  : "border-transparent text-muted-foreground",
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
