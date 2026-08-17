import { ChevronDown } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Lista de seleção.
 *
 * O `<select>` nativo continua sendo o elemento — teclado, leitor de tela e o
 * seletor em roda do celular vêm de graça e nenhum componente customizado faz
 * isso melhor. O que muda é a aparência: escondemos a setinha do sistema
 * operacional (que denuncia "formulário padrão") e desenhamos a nossa por
 * cima, com o mesmo traço dos outros ícones.
 */
export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  // A classe recebida vai para o WRAPPER, não para o <select>: as chamadas
  // passam largura e alinhamento (`w-48`, `ml-auto`), e isso precisa valer
  // para a caixa inteira — senão o invólucro estica e o alinhamento se perde.
  <div className={cn("relative w-full", className)}>
    <select
      ref={ref}
      className={cn(
        "flex h-11 w-full appearance-none rounded-input border border-input bg-card",
        "cursor-pointer truncate py-0 pl-4 pr-10 text-sm text-foreground",
        "transition-[border-color,box-shadow] duration-[var(--dur-instant)]",
        "hover:border-foreground/30",
        "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden
    />
  </div>
));
Select.displayName = "Select";
