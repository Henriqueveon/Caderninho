import { MailCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/redefinir-senha` },
    );
    setSubmitting(false);
    if (err) {
      setError("Não foi possível enviar o e-mail. Tente novamente.");
      return;
    }
    // sempre confirma (não revela se o e-mail existe)
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout subtitle="Recuperação de senha.">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-tint)]">
            <MailCheck className="h-7 w-7 text-primary" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Verifique seu e-mail</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Se houver uma conta para{" "}
              <span className="font-medium text-foreground">{email}</span>,
              enviamos um link para redefinir a senha.
            </p>
          </div>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">
            Voltar para o login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout subtitle="Recuperação de senha.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Esqueceu a senha?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe seu e-mail e enviaremos um link para criar uma nova.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Enviando…" : "Enviar link"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      </p>
    </AuthLayout>
  );
}
