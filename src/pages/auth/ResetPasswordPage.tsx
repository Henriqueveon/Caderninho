import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { homePathFor, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

/**
 * Aberta pelo link do e-mail de recuperação. O supabase-js detecta o token
 * na URL e cria uma sessão de recuperação; aqui a pessoa define a nova senha.
 */
export function ResetPasswordPage() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) {
      setError("Não foi possível redefinir. O link pode ter expirado.");
      return;
    }
    navigate(profile ? homePathFor(profile.role) : "/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <AuthLayout subtitle="Redefinir senha.">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <h2 className="text-lg font-semibold">Link inválido ou expirado</h2>
          <p className="text-sm text-muted-foreground">
            Abra esta página pelo link enviado no e-mail de recuperação. Se ele
            expirou, peça um novo.
          </p>
          <Link
            to="/esqueci-senha"
            className="text-sm font-medium text-primary hover:underline"
          >
            Pedir novo link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout subtitle="Redefinir senha.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Crie uma nova senha</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha uma senha com pelo menos 8 caracteres.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Nova senha</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Confirme a nova senha</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}
