import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export function ClientHome() {
  const { profile } = useAuth();

  return (
    <section>
      <h1 className="text-2xl font-semibold">
        Olá, {profile?.full_name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Agende seu próximo horário
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Agendamento online
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Em breve você poderá escolher o serviço, a profissional e o horário
            por aqui (Fase 4).
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
