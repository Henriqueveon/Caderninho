import { cn } from "@/lib/utils";

/** "Página de papel": superfície com linha-guia fina, sem sombra pesada. */
export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[16px] border border-rule bg-card", className)}>
      {children}
    </div>
  );
}
