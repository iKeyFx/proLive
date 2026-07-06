"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "ok" | "error" | "info";
interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
}

interface ToastApi {
  show: (t: Omit<Toast, "id">) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const toneStyles: Record<ToastTone, string> = {
  ok: "border-up/40 bg-up/10",
  error: "border-down/40 bg-down/10",
  info: "border-line bg-ink-700",
};

const toneDot: Record<ToastTone, string> = {
  ok: "bg-up",
  error: "bg-down",
  info: "bg-signal",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur, { ...t, id }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* Polite live region: trade outcomes are announced to screen readers. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-20 right-4 z-50 flex w-[min(92vw,22rem)] flex-col gap-2 md:bottom-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-md border px-3.5 py-3 shadow-lg backdrop-blur ${toneStyles[t.tone]}`}
            role={t.tone === "error" ? "alert" : "status"}
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[t.tone]}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-hi">{t.title}</p>
              {t.detail && <p className="tnum mt-0.5 text-xs text-text-lo">{t.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
