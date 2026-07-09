import { cn } from "@/lib/utils";

/** Marca do Caderninho: caderno + pincel de esmalte com gota, em rose gold. */
export function LogoMark({
  size = 40,
  id = "cad-grad",
}: {
  size?: number;
  id?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary-light)" />
          <stop offset="0.55" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--primary-dark)" />
        </linearGradient>
      </defs>

      {/* caderno */}
      <path
        d="M13 8h12a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z"
        fill={`url(#${id})`}
      />
      {/* linhas de anotação */}
      <g stroke="var(--card)" strokeWidth="2.2" strokeLinecap="round">
        <line x1="14.5" y1="16.5" x2="22.5" y2="16.5" />
        <line x1="14.5" y1="22" x2="24.5" y2="22" />
        <line x1="14.5" y1="27.5" x2="20.5" y2="27.5" />
      </g>

      {/* pincel — cabo diagonal */}
      <g transform="rotate(40 31 13)">
        <rect
          x="28.4"
          y="3"
          width="5.2"
          height="13"
          rx="2.6"
          fill={`url(#${id})`}
          stroke="var(--card)"
          strokeWidth="0.8"
        />
        <rect x="28.4" y="15" width="5.2" height="4.2" rx="1" fill="var(--primary-dark)" />
      </g>
      {/* gota de esmalte */}
      <path
        d="M28.9 28.2c0-2.6 2.6-4.1 2.6-6.7 0 2.6 2.6 4.1 2.6 6.7a2.6 2.6 0 0 1-5.2 0Z"
        fill={`url(#${id})`}
        stroke="var(--card)"
        strokeWidth="0.8"
      />
    </svg>
  );
}

export function Logo({
  size = 36,
  withWordmark = true,
  className,
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {withWordmark && (
        <span
          className="text-xl font-semibold tracking-tight text-foreground"
          style={{ fontWeight: 600 }}
        >
          Caderninho
        </span>
      )}
    </div>
  );
}
