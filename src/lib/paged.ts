/** Tamanho máximo que o PostgREST devolve por requisição. */
const PAGE = 1000;
/** Trava de segurança: 20 páginas = 20 mil linhas. Acima disso é bug, não uso. */
const MAX_PAGES = 20;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Busca uma tabela inteira em páginas.
 *
 * O Supabase corta a resposta em 1000 linhas e NÃO avisa — quem soma o que
 * voltou acha que somou tudo. Em relatório financeiro isso vira número errado
 * sem erro na tela, que é o pior tipo de bug. Períodos longos (ano, intervalo
 * livre) passam de 1000 com facilidade, então aqui a gente pagina até acabar.
 */
export async function fetchPaged<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const from = i * PAGE;
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
  return out;
}
