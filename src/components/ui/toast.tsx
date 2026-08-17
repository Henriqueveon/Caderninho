import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { DUR, EASE_IN, EASE_OUT } from "@/lib/motion";

/**
 * Avisos de confirmação.
 *
 * Hoje a pessoa salva as configurações e não acontece nada visível — ela fica
 * sem saber se deu certo e clica de novo. Escrito à mão em vez de trazer uma
 * biblioteca: são ~80 linhas, e uma dependência a mais custa bundle e
 * manutenção para sempre.
 *
 * `aria-live="polite"` faz o leitor de tela anunciar sem interromper o que a
 * pessoa está fazendo. Erro fica na tela mais tempo — quem errou precisa ler.
 */
type ToastKind = "success" | "error";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-2), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 7000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        // Acima da barra de navegação do celular, e fora do caminho do dedo.
        className="pointer-events-none fixed inset-x-0 bottom-[76px] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: DUR.base, ease: EASE_OUT },
              }}
              exit={{
                opacity: 0,
                y: 8,
                scale: 0.98,
                transition: { duration: DUR.fast, ease: EASE_IN },
              }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border border-border bg-card p-3.5 shadow-[var(--sheen),var(--shadow-float)]"
            >
              <span
                className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  t.kind === "success"
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive"
                }`}
              >
                {t.kind === "success" ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                )}
              </span>
              <p className="min-w-0 flex-1 text-sm">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Fechar aviso"
                className="-m-1 shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
