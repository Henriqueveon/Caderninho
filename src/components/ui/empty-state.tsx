import { motion } from "framer-motion";

import { enterT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Página em branco do caderno — o desenho dos estados vazios.
 *
 * Traço fino em vez de ícone preenchido: acompanha a espessura dos ícones e da
 * tipografia, e não compete com o conteúdo real. As linhas ficam pela metade
 * de propósito, sugerindo página começada e não terminada — que é exatamente
 * o que um estado vazio é.
 */
function EmptyMark() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-16 w-16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      aria-hidden
    >
      <path
        d="M14 8h28l8 8v40a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z"
        className="text-primary/35"
      />
      <path d="M42 8v8h8" className="text-primary/35" />
      <g className="text-primary/55">
        <path d="M21 27h22" />
        <path d="M21 35h16" />
        <path d="M21 43h9" />
      </g>
      {/* pingo de esmalte: a marca do estúdio no canto da página */}
      <circle cx="44" cy="45" r="4.5" className="text-primary/70" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={enterT}
      className={cn(
        "flex flex-col items-center gap-3 rounded-card border border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <EmptyMark />
      <div>
        <p className="font-medium">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </motion.div>
  );
}
