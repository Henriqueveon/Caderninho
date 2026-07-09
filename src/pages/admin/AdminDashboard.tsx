import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export function AdminDashboard() {
  const { profile } = useAuth();

  return (
    <section>
      <h1 className="text-2xl font-semibold">
        Olá, {profile?.full_name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Visão geral do estúdio
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["Faturamento do mês", "Atendimentos hoje", "Taxa de ocupação"].map(
          (label) => (
            <Card key={label}>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="tnums text-3xl font-semibold">—</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Em breve (Fase 3)
                </p>
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </section>
  );
}
