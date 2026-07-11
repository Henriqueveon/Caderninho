import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { homePathFor, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface InviteInfo {
  full_name: string | null;
  email: string;
  studio_name: string;
  accepted: boolean;
}

/**
 * Fluxo de convite: a gestora gera o link com token; a convidada define a
 * senha e o RPC accept_invite promove o perfil (professional/secretary).
 * Requer confirmação de e-mail DESLIGADA no Supabase (a ativação é imediata).
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

    // 1. cria a conta (ou entra, se já existir)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: { data: { full_name: invite.full_name ?? "" } },
    });

    if (signUpError && !signUpError.message.toLowerCase().includes("already")) {
      setError("Não foi possível criar a conta. Tente novamente.");
      setSubmitting(false);
      return;
    }

    if (signUpError) {
      // conta já existe: entra com a senha informada
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });
      if (signInError) {
        setError("Este e-mail já tem conta. Use a senha atual dela.");
        setSubmitting(false);
        return;
      }
    } else if (!signUpData.session) {
      // confirmação de e-mail está ligada → não dá para ativar na hora
      setError(
        "A confirmação de e-mail precisa estar desligada para ativar o convite. Avise a gestora.",
      );
      setSubmitting(false);
      return;
    }

    // 2. aceita o convite → promove o perfil
    const { error: acceptError } = await supabase.rpc("accept_invite", {
      invite_token: token,
    });
    if (acceptError) {
      setError("Convite inválido ou já utilizado.");
      setSubmitting(false);
      return;
    }

    await refreshProfile();
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", (await supabase.auth.getUser()).data.user!.id)
      .single();
    navigate(homePathFor((data?.role as never) ?? "professional"), {
      replace: true,
    });
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
      <AuthLayout subtitle="Convite de acesso.">
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <h2 className="text-lg font-semibold">Convite inválido</h2>
          <p className="text-sm text-muted-foreground">
            Este convite não existe ou já foi utilizado. Peça um novo link para
            a gestora do estúdio.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      subtitle={`Você foi convidada para o ${invite.studio_name}.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {invite.full_name && (
          <p className="text-sm text-muted-foreground">
            Olá, <span className="font-medium text-foreground">{invite.full_name}</span>! Defina
            sua senha para ativar o acesso.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={invite.email} disabled />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Defina sua senha</Label>
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
          {submitting ? "Ativando…" : "Ativar minha conta"}
        </Button>
      </form>
    </AuthLayout>
  );
}
