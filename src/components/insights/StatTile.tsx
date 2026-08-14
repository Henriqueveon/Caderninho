/** Indicador editorial: rótulo em versalete, número serifado. Sem moldura —
 *  a moldura vem do container (grade com linhas-guia), como um razão. */
export function StatTile({
  label,
  value,
  caption,
  accent = "text-foreground",
}: {
  label: string;
  value: string;
  caption?: string;
  accent?: string;
}) {
  return (
    <div className="px-3 py-3.5 text-center">
      <p className="kicker">{label}</p>
      <p className={`figure mt-1.5 whitespace-nowrap text-2xl font-semibold ${accent}`}>
        {value}
      </p>
      {caption && <p className="mt-0.5 text-[11px] text-muted-foreground">{caption}</p>}
    </div>
  );
}
