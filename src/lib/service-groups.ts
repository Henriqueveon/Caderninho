import type { Service } from "@/types/database";

/**
 * Famílias do catálogo.
 *
 * O catálogo do estúdio cresceu para quase 30 itens numa lista alfabética, o
 * que colocou "Curso VIP — R$ 1.697" ao lado de "Cutilagem — R$ 30". Agrupar
 * por família devolve a hierarquia sem obrigar ninguém a recadastrar nada: a
 * classificação sai do próprio nome do serviço.
 *
 * A ordem daqui é a ordem que aparece na tela — do carro-chefe ao acessório.
 */
export interface ServiceGroup {
  key: string;
  label: string;
  /** Casa com o nome do serviço, em minúsculas e sem acento. */
  match: RegExp;
}

// A ordem importa: o primeiro que casar leva o serviço. Vai do mais
// específico para o mais genérico.
export const SERVICE_GROUPS: ServiceGroup[] = [
  { key: "cursos", label: "Cursos", match: /curso|aula|workshop/ },
  { key: "alongamento", label: "Alongamento", match: /alongamento|molde|acrilic|soft gel|reposic/ },
  { key: "manutencao", label: "Manutenção", match: /manutenc/ },
  { key: "maos-pes", label: "Mãos e pés", match: /manicure|pedicure|spa/ },
  { key: "esmaltacao", label: "Esmaltação", match: /esmaltac|gel|blindagem|cutilagem|unha a parte/ },
  { key: "outros", label: "Outros", match: /.*/ },
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function groupOf(service: Pick<Service, "name">): ServiceGroup {
  const n = normalize(service.name);
  return SERVICE_GROUPS.find((g) => g.match.test(n)) ?? SERVICE_GROUPS.at(-1)!;
}

/** Agrupa preservando a ordem de SERVICE_GROUPS e omitindo grupo vazio. */
export function groupServices<T extends Pick<Service, "name">>(services: T[]) {
  const byKey = new Map<string, T[]>();
  for (const s of services) {
    const k = groupOf(s).key;
    byKey.set(k, [...(byKey.get(k) ?? []), s]);
  }
  return SERVICE_GROUPS.filter((g) => byKey.has(g.key)).map((g) => ({
    group: g,
    items: byKey.get(g.key)!.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  }));
}

/**
 * Serviço sem cobrança (permuta, compromisso interno, cortesia). Mostrar
 * "R$ 0,00" faz parecer cadastro incompleto — é intencional, então o rótulo
 * precisa dizer isso com todas as letras.
 */
export function isFree(price: number): boolean {
  return Number(price) === 0;
}

export function priceLabel(price: number, name: string): string {
  if (!isFree(price)) return "";
  return /permuta/i.test(name) ? "Permuta" : "Sem cobrança";
}
