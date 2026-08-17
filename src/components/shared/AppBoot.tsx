import { Logo } from "@/components/brand/Logo";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Abertura do app.
 *
 * Enquanto a sessão é restaurada não dá para montar o menu — ele depende do
 * papel de quem entrou. Mas mostrar uma página em branco com um bolinha
 * girando no meio é a cara de "site carregando": a pessoa fica olhando o vazio
 * sem saber se abriu o app certo.
 *
 * Aqui o esqueleto do próprio Caderninho aparece na hora, com a marca no
 * lugar. A espera é a mesma; a sensação é de aplicativo abrindo.
 */
export function AppBoot() {
  return (
    <div className="min-h-screen md:flex" role="status" aria-label="Abrindo o Caderninho">
      {/* Coluna lateral (desktop) */}
      <div className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/60 p-5 md:flex">
        <div className="mb-8 px-1">
          <Logo size={34} />
        </div>
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-3">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-3.5" style={{ width: `${50 + ((i * 13) % 40)}%` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Topo (celular) */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-3 md:hidden">
        <Logo size={30} />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <main className="flex-1">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-8">
          <div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2.5 h-8 w-56" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-card border border-border bg-card p-5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-7 w-24" />
              </div>
            ))}
          </div>
          <div className="rounded-card border border-border bg-card p-5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-4 h-28 w-full" />
          </div>
        </div>
      </main>
    </div>
  );
}
