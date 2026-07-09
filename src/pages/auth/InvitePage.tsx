import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface InviteInfo {
  full_name: string | null;
  email: string;
  studio_name: string;
  accepted: boolean;
}

/**
 * Fluxo de convite da profissional: a gestora gera o link com token;
 * a convidada define a senha aqui e o RPC accept_invite promove o
 * perfil para 'professional' no estúdio correto.
 */
export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "invalid" | "ready">(
    "loading",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    supabase
      .rpc("get_invite", { invite_token: token })
      .single()
      .then(({ data, error: rpcError }) => {
        const info = data as InviteInfo | null;
        if (rpcError || !info || info.accepted) {
          setStatus("invalid");
        } else {
          setInvite(info);
          setStatus("ready");
        }
      });
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!invite || !token) return;
    setError(null);
    setSubmitting(true);

    // 1. Cria a conta (o trigger cria o profile como client)
    const { error: signUpError } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: { data: { full_name: invite.full_name ?? "" } },
    });
    if (signUpError && signUpError.message !== "User already registered") {
      setError("Não foi possível criar a conta. Tente novamente.");
      setSubmitting(false);
      return;
    }
    if (signUpError) {
      // conta já existe: tenta logar com a senha informada
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });
      if (signInError) {
        setError("Este e-mail já tem conta. Entre com a senha original.");
        setSubmitting(false);
        return;
      }
    }

    // 2. Aceita o convite → vira professional
    const { error: acceptError } = await supabase.rpc("accept_invite", {
      invite_token: token,
    });
    if (acceptError) {
      setError("Convite inválido ou já utilizado.");
      setSubmitting(false);
      return;
    }

    await refreshProfile();
    navigate("/pro/dashboard", { replace: true });
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status === "invalid" || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Convite inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              Este convite não existe ou já foi utilizado. Peça um novo link
              para a gestora do estúdio.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-semibold text-primary">Caderninho</h1>
          <CardTitle className="text-base font-normal text-muted-foreground">
            {invite.full_name ? `Olá, ${invite.full_name}! ` : ""}
            Você foi convidada para o {invite.studio_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={invite.email} disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Defina sua senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
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
              {submitting ? "Ativando…" : "Ativar minha conta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
