import { forwardRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Ícones do Caderninho.
 *
 * O menu é a única coisa da interface que a pessoa olha o dia inteiro, e era
 * 100% biblioteca padrão — é isso que faz um app bonito ainda parecer
 * template. Aqui existe um conjunto próprio só para a navegação; o resto do
 * produto continua no Lucide, que é excelente e não vale redesenhar.
 *
 * Regras do conjunto, para ele parecer uma família e não dez desenhos soltos:
 *  - grade de 24, traço de 1.5, pontas e cantos arredondados;
 *  - dois motivos que se repetem e assinam o conjunto: a ESPIRAL do caderno
 *    (três argolinhas na borda de cima) e o PINGO de esmalte;
 *  - nada preenchido, exceto o pingo — ele é o acento e aparece uma vez por
 *    ícone, no máximo.
 */

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

const Icon = forwardRef<SVGSVGElement, IconProps & { children: React.ReactNode }>(
  ({ className, children, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  ),
);
Icon.displayName = "Icon";

/** Argolinhas da espiral — o motivo que amarra o conjunto. */
const Spiral = () => (
  <>
    <path d="M8 2.5v2.6" />
    <path d="M12 2.5v2.6" />
    <path d="M16 2.5v2.6" />
  </>
);

/**
 * Início — o caderno ABERTO, com a marca de página descendo no vinco.
 *
 * Ele não leva espiral de propósito: Agenda, Horários e Agendar já usam esse
 * motivo, e quatro itens do mesmo menu com a mesma silhueta viram um borrão a
 * 20px. Silhueta distinta vale mais que consistência de enfeite.
 */
export const IcHome = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 6.4C10.4 4.9 8.4 4.2 5.6 4.2A1.6 1.6 0 0 0 4 5.8v11.4c0 .9.7 1.6 1.6 1.6 2.8 0 4.8.7 6.4 2.2" />
    <path d="M12 6.4c1.6-1.5 3.6-2.2 6.4-2.2 .9 0 1.6.7 1.6 1.6v11.4c0 .9-.7 1.6-1.6 1.6-2.8 0-4.8.7-6.4 2.2" />
    <path d="M12 6.4V21" />
    <path d="M12 4.2v3.2" strokeWidth={2.6} className="text-primary" />
  </Icon>
);

/** Insights — a curva que sobe, com o pingo no ponto mais alto. */
export const IcInsights = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 20.5h17" />
    <path d="M4.5 16.5c3-.6 4.6-3.4 6.5-5.6 1.7-2 3.4-3.9 6-4.4" />
    <circle cx="18.4" cy="6.2" r="1.9" fill="currentColor" stroke="none" />
    <path d="M7.5 20.5v-3.2" />
    <path d="M12 20.5v-5.4" />
    <path d="M16.5 20.5v-8" />
  </Icon>
);

/** Agenda — a folha do mês com a espiral. */
export const IcAgenda = (p: IconProps) => (
  <Icon {...p}>
    <Spiral />
    <rect x="3.5" y="5" width="17" height="16.5" rx="2.5" />
    <path d="M3.5 9.5h17" />
    <circle cx="8.5" cy="14" r="1.4" fill="currentColor" stroke="none" />
    <path d="M13 14h4" />
    <path d="M7 18h10" />
  </Icon>
);

/** Atendimentos — a folha com o risco de concluído. */
export const IcAppointments = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 3.5h6a1.5 1.5 0 0 1 1.5 1.5v.5h-9V5A1.5 1.5 0 0 1 9 3.5Z" />
    <path d="M16.5 5.5H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h1.5" />
    <path d="M8.5 13.5l2.2 2.2 4.8-5" />
  </Icon>
);

/** Clientes — a pessoa, com o pingo marcando presença. */
export const IcClients = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20.5c.6-3.8 3.5-6 7-6s6.4 2.2 7 6" />
    <circle cx="18.6" cy="5.4" r="1.7" fill="currentColor" stroke="none" />
  </Icon>
);

/** Financeiro — a nota dobrada, com a moeda. */
export const IcFinance = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
    <circle cx="12" cy="12" r="2.8" />
    <path d="M6 9.5v5" />
    <path d="M18 9.5v5" />
  </Icon>
);

/** Equipe — as três da casa, ombro a ombro. */
export const IcTeam = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 20c.5-3.2 2.8-5.2 5.5-5.2s5 2 5.5 5.2" />
    <path d="M16 6.2a3 3 0 0 1 0 5.6" />
    <path d="M17.5 14.4c1.7.7 2.8 2.3 3 5.6" />
  </Icon>
);

/** Serviços — o vidro de esmalte. Muito mais do estúdio que uma tesoura. */
export const IcServices = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.5 2.5h3v3h-3z" />
    <path d="M9 8.2c0-1.5 1.2-2.7 2.7-2.7h.6c1.5 0 2.7 1.2 2.7 2.7v11.3a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z" />
    <path d="M9 12h6" />
  </Icon>
);

/** Histórico — a folha virando para trás. */
export const IcHistory = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.8 9.2a8.5 8.5 0 1 1-.3 4.6" />
    <path d="M3.2 4.5v4.8h4.8" />
    <path d="M12 8v4.4l2.9 1.8" />
  </Icon>
);

/** Ajustes — os controles deslizantes. */
export const IcSettings = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7.5h10" />
    <path d="M18 7.5h2" />
    <path d="M4 16.5h5" />
    <path d="M13 16.5h7" />
    <circle cx="16" cy="7.5" r="2.3" />
    <circle cx="11" cy="16.5" r="2.3" />
  </Icon>
);

/** Horários — o relógio dentro da folha. */
export const IcSchedule = (p: IconProps) => (
  <Icon {...p}>
    <Spiral />
    <path d="M20.5 12.2V7.5A2.5 2.5 0 0 0 18 5H6a2.5 2.5 0 0 0-2.5 2.5V19A2.5 2.5 0 0 0 6 21.5h6.2" />
    <path d="M3.5 9.5h17" />
    <circle cx="17.5" cy="17.5" r="4" />
    <path d="M17.5 15.6v2l1.3.9" />
  </Icon>
);

/** Agendar — a folha com o mais. */
export const IcBook = (p: IconProps) => (
  <Icon {...p}>
    <Spiral />
    <path d="M20.5 12V7.5A2.5 2.5 0 0 0 18 5H6a2.5 2.5 0 0 0-2.5 2.5V19A2.5 2.5 0 0 0 6 21.5h6" />
    <path d="M3.5 9.5h17" />
    <path d="M17.5 15v6" />
    <path d="M14.5 18h6" />
  </Icon>
);

/** Perfil — a pessoa no cartão. */
export const IcProfile = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="3" />
    <circle cx="9.5" cy="10.5" r="2.3" />
    <path d="M6 16.2c.4-1.7 1.8-2.7 3.5-2.7s3.1 1 3.5 2.7" />
    <path d="M15.5 10h3" />
    <path d="M15.5 13.5h3" />
  </Icon>
);
