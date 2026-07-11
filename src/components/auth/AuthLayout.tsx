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
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Logo size={52} withWordmark={false} />
        <div>
          <h1 className="text-2xl font-semibold">Caderninho</h1>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">{children}</CardContent>
      </Card>
    </div>
  );
}
