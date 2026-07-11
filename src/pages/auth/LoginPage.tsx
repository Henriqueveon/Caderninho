import { type FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { homePathFor, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export function LoginPage() {
  const { session, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session && profile) {
    return <Navigate to={homePathFor(profile.role)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes("not confirmed")) {
        setError(
          "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e o spam).",
        );
      } else {
        setError("E-mail ou senha incorretos.");
      }
      setSubmitting(false);
    }
    // sucesso: AuthContext atualiza a sessão e o Navigate acima redireciona
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link
              to="/esqueci-senha"
              className="text-xs font-medium text-primary hover:underline"
            >
              Esqueci a senha
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Cliente nova?{" "}
        <Link to="/signup" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthLayout>
  );
}
