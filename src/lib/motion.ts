import type { Transition, Variants } from "framer-motion";

/**
 * Vocabulário de movimento do Caderninho.
 *
 * Três regras que valem para tudo aqui:
 *  1. Duração vem da DISTÂNCIA percorrida — um sheet que sobe a tela inteira
 *     não pode levar o mesmo tempo que um botão que afunda 2px.
 *  2. Saída é sempre mais rápida que entrada. Ver algo chegar é agradável;
 *     esperar algo ir embora é atraso.
 *  3. No máximo um ou dois elementos animados por tela. Tudo se mexendo ao
 *     mesmo tempo não é sofisticado, é enjoativo.
 *
 * Os tempos espelham os tokens de `tokens.css` (que zeram sozinhos quando o
 * sistema pede menos movimento).
 */

export const EASE_OUT = [0.22, 0.61, 0.36, 1] as const; // chegando
export const EASE_IN = [0.55, 0.06, 0.68, 0.19] as const; // saindo

export const DUR = {
  instant: 0.09,
  fast: 0.16,
  base: 0.24,
  slow: 0.36,
} as const;

export const enterT: Transition = { duration: DUR.base, ease: EASE_OUT };
export const exitT: Transition = { duration: DUR.fast, ease: EASE_IN };

/** Conteúdo de página: sobe 8px e aparece. Discreto de propósito — a troca de
 *  tela deve dar continuidade, não chamar atenção para si. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: enterT },
  exit: { opacity: 0, y: -4, transition: exitT },
};

/** Lista que entra em cascata. `stagger` pequeno: acima de ~60ms por item a
 *  lista parece lenta em vez de viva. */
export const listVariants: Variants = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export const itemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: enterT },
};

/** Painel lateral / modal: distância grande, então tempo maior. */
export const sheetVariants: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DUR.slow, ease: EASE_OUT },
  },
  exit: { opacity: 0, y: 12, scale: 0.99, transition: exitT },
};

/** Mola curta para números e barras que "assentam" no lugar. */
export const settle: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 26,
  mass: 0.9,
};
