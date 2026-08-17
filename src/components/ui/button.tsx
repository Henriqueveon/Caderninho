import { type VariantProps, cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Botão do Caderninho.
 *
 * O que o tira da cara de template:
 *  - realce interno (`--sheen`) no topo: a luz de cima que dá volume sem cair
 *    no neumorfismo, marca do "Soft UI";
 *  - afundar no toque em vez de encolher a caixa — `translateY` não empurra o
 *    layout em volta nem causa tremida no celular;
 *  - resposta em 90ms (a mão sente até ~100ms; acima disso parece travado),
 *    mas sombra/cor voltam em 240ms, o que dá a sensação de peso;
 *  - `cursor-pointer` e alvo de 44px de altura, mínimo de toque confortável.
 */
const buttonVariants = cva(
  [
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap",
    "rounded-full font-medium cursor-pointer",
    "transition-[transform,box-shadow,background-color,color,opacity]",
    "duration-[var(--dur-base)] ease-[var(--ease-out)]",
    "active:duration-[var(--dur-instant)] active:translate-y-[1px]",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]",
    "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-gradient-primary text-primary-foreground",
          "shadow-[var(--sheen-primary),var(--shadow-soft)]",
          "hover:shadow-[var(--sheen-primary),var(--shadow-float)] hover:-translate-y-px",
          "active:shadow-[var(--sheen-primary),var(--shadow-soft)]",
        ].join(" "),
        secondary: [
          "border border-border bg-card text-foreground",
          "shadow-[var(--sheen),0_1px_2px_rgba(74,48,52,0.05)]",
          "hover:border-border-strong hover:bg-secondary",
        ].join(" "),
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-secondary",
        ghost: "text-foreground hover:bg-secondary",
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-[var(--sheen-primary),var(--shadow-soft)]",
          "hover:-translate-y-px hover:shadow-[var(--sheen-primary),var(--shadow-float)]",
        ].join(" "),
      },
      size: {
        default: "h-11 px-5 text-sm",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Mostra o giro e bloqueia o clique — sem trocar a largura do botão. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {/* O conteúdo continua ocupando o mesmo espaço enquanto carrega, então o
          botão não muda de tamanho e nada pula na tela. */}
      <span
        className={cn(
          "inline-flex items-center gap-2 transition-opacity",
          loading && "opacity-0",
        )}
      >
        {children}
      </span>
      {loading && (
        <Loader2 className="absolute h-4 w-4 animate-spin" aria-hidden />
      )}
    </button>
  ),
);
Button.displayName = "Button";
