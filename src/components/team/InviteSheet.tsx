import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { useCreateInvite } from "@/hooks/useTeam";

export function InviteSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateInvite();
  const [role, setRole] = useState<"professional" | "secretary">("professional");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [commission, setCommission] = useState("50");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setRole("professional");
    setFullName("");
    setEmail("");
    setCommission("50");
    setLink(null);
    setCopied(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const token = await create.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim(),
        role,
        commissionPct: role === "professional" ? Number(commission) : 50,
      });
      setLink(`${window.location.origin}/invite/${token}`);
    } catch (err) {
      setError((err as Error).message ?? "Não foi possível criar o convite.");
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Convidar para a equipe"
      description="Gere um link para a nova integrante definir a senha."
    >
      {link ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Envie este link para <strong>{fullName || email}</strong>. Ao abrir,
            ela define a senha e já entra no painel dela.
          </p>
          <div className="flex items-center gap-2">
            <Input readOnly value={link} className="text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={copy}>
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            O link vale até ser usado. Você pode revogá-lo na lista de convites
            pendentes.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => reset()}
          >
            Convidar outra pessoa
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Função</Label>
            <Select
              id="role"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "professional" | "secretary")
              }
            >
              <option value="professional">Profissional (parceira)</option>
              <option value="secretary">Secretária</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="iname">Nome</Label>
            <Input
              id="iname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="iemail">E-mail</Label>
            <Input
              id="iemail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {role === "professional" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="icomm">Comissão (%)</Label>
              <Input
                id="icomm"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Gerando…" : "Gerar link de convite"}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
