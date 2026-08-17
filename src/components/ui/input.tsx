import { forwardRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Campo de texto.
 *
 * O contorno usa `border-input` (--border-strong), não a borda decorativa dos
 * cards: o limite de um CONTROLE precisa de 3:1 para a pessoa enxergar onde
 * clicar (WCAG 1.4.11). Borda invisível é bonita em mockup e ruim na mão.
 */
export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-11 w-full rounded-input border border-input bg-card px-4 text-sm text-foreground",
      "transition-[border-color,box-shadow] duration-[var(--dur-instant)]",
      "placeholder:text-muted-foreground hover:border-foreground/30",
      "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Tira o cromo nativo do Windows: spinner de número e ícone de relógio
      // vinham com desenho do sistema, destoando de tudo em volta.
      "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
      "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-45",
      "[&::-webkit-calendar-picker-indicator]:hover:opacity-90",
      "[&[type=number]]:[-moz-appearance:textfield]",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
