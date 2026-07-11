import { MailCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { homePathFor, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const STUDIO_SLUG = "caderninho"; // v2 SaaS: derivar do subdomínio/URL do estúdio

export function SignupPage() {
  const { session, profile, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false); // cadastro exigiu confirmação por e-mail

  if (!loading && session && profile) {
    return <Navigate to={homePathFor(profile.role)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone.trim(), studio_slug: STUDIO_SLUG },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (authError) {
      setError(
        authError.message.toLowerCase().includes("already registered")
          ? "Este e-mail já está cadastrado. Tente entrar."
          : "Não foi possível criar a conta. Tente novamente.",
      );
      setSubmitting(false);
      return;
    }
    // Sem sessão = confirmação de e-mail exigida. Com sessão, o Navigate acima entra.
    if (!data.session) {
      setSent(true);
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout subtitle="Falta só um passo.">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-tint)]">
            <MailCheck className="h-7 w-7 text-primary" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Confirme seu e-mail</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enviamos um link de confirmação para{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Abra o e-mail para ativar sua conta e depois é só entrar.
            </p>
          </div>
          <Button onClick={() => setSent(false)} variant="outline">
            Voltar
          </Button>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">
            Ir para o login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout subtitle="Crie sua conta de cliente.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Nome completo</Label>
          <Input
            id="fullName"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Criando conta…" : "Criar conta"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
