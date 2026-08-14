/** Divisória de "planner": rótulo em versalete + linha-guia preenchendo a linha. */
export function SectionLabel({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="kicker shrink-0">{children}</span>
      <span className="h-px flex-1 bg-rule" />
      {right && <span className="shrink-0">{right}</span>}
    </div>
  );
}
