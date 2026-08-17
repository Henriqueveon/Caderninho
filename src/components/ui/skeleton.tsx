import { cn } from "@/lib/utils";

/**
 * Bloco de carregamento.
 *
 * Um "Carregando…" cinza no meio da tela parece página web esperando; um
 * bloco com a FORMA do conteúdo que vai chegar parece aplicativo. O ganho é
 * de percepção: o tempo é o mesmo, a espera é que fica menor — e a tela não
 * pula quando o conteúdo entra, porque o espaço já estava reservado.
 *
 * O brilho é um gradiente que atravessa; em `prefers-reduced-motion` ele
 * simplesmente não corre e sobra o bloco parado.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-lg bg-secondary",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-black/[0.045] after:to-transparent",
        "motion-reduce:after:hidden",
        className,
      )}
      {...props}
    />
  );
}

/** Linhas de texto. A última sai mais curta — parágrafo real não termina reto. */
export function SkeletonText({
  lines = 2,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Lista de linhas (extrato, atendimentos, histórico). */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-border" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

/** Grade de cartões (serviços, equipe, clientes). */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Carregando"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-card border border-border bg-card p-4">
          <Skeleton className="h-4 w-3/4" />
          <div className="mt-6 flex items-end justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3.5 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}
