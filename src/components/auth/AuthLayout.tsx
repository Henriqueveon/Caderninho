import { Logo } from "@/components/brand/Logo";
import { Card, CardContent } from "@/components/ui/card";

const DEFAULT_SUBTITLE =
  "Seu caderninho de anotações do estúdio, agora profissional.";

/** Moldura de marca compartilhada por todas as telas de autenticação. */
export function AuthLayout({
  children,
  subtitle = DEFAULT_SUBTITLE,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      {/* O lockup oficial já traz o nome desenhado — repetir "Caderninho" em
          texto logo abaixo dizia a mesma coisa duas vezes, e na fonte errada. */}
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Logo size={64} />
        <h1 className="sr-only">Caderninho</h1>
        <p className="max-w-xs text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">{children}</CardContent>
      </Card>
    </div>
  );
}
