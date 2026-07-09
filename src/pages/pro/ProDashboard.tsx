import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export function ProDashboard() {
  const { profile } = useAuth();

  return (
    <section>
      <h1 className="text-2xl font-semibold">
        Olá, {profile?.full_name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Seus ganhos e sua agenda
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Realizado no mês", hint: "earnings finalizados" },
          { label: "Já garantido", hint: "atendimentos agendados" },
          { label: "Potencial máximo", hint: "slots livres × ticket médio" },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="tnums text-3xl font-semibold">—</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Em breve (Fase 3) · {item.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
