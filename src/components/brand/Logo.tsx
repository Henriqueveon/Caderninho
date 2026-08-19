import marcaUrl from "@/assets/logo/caderninho-marca.png";
import logoClaroUrl from "@/assets/logo/caderninho-claro.png";
import logoEscuroUrl from "@/assets/logo/caderninho-escuro.png";
import { cn } from "@/lib/utils";

/**
 * Marca oficial do Caderninho.
 *
 * Os arquivos vêm da arte enviada pela gestora e ficam em `src/assets/logo/`.
 * O que existia antes era uma recriação em SVG, feita antes de haver marca —
 * ela nunca bateu com a original e saiu de cena.
 *
 * Três arquivos, todos recortados na caixa exata do desenho (sem margem morta)
 * e com fundo transparente, para assentarem sobre a parede texturizada:
 *   caderninho-claro.png   lockup completo, palavra em preto — fundo claro
 *   caderninho-escuro.png  o mesmo com a palavra em creme — fundo escuro
 *   caderninho-marca.png   só o caderno com o pincel — espaços apertados
 *
 * A troca claro/escuro é feita por CSS (as duas imagens ficam no DOM e uma
 * some), e não por JavaScript: assim a marca certa já aparece na primeira
 * pintura, sem piscar a versão errada enquanto o tema é decidido.
 */

/** Só o símbolo — para o quadrado do login e espaços estreitos. */
export function LogoMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={marcaUrl}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      style={{ height: size, width: "auto" }}
    />
  );
}

export function Logo({
  size = 36,
  withWordmark = true,
  className,
}: {
  /** Altura em pixels — vale para o símbolo sozinho e para o lockup.
   *  A largura sempre acompanha a proporção do arquivo. */
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  if (!withWordmark) {
    return <LogoMark size={size} className={className} />;
  }

  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={logoClaroUrl}
        alt="Caderninho"
        className="w-auto dark-hidden"
        style={{ height: size }}
      />
      <img
        src={logoEscuroUrl}
        alt="Caderninho"
        className="light-hidden w-auto"
        style={{ height: size }}
      />
    </div>
  );
}
