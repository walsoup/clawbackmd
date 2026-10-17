"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastItem = { id: number; message: string; tone: "info" | "warn" | "error" };

type ToastCtx = {
  toast: (message: string, tone?: ToastItem["tone"]) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastItem["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        <div className="flex w-full max-w-md flex-col gap-2">
          {items.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-[var(--ln-pill-radius)] px-4 py-3 text-[14px] leading-5 shadow-none ${
                t.tone === "warn" || t.tone === "error"
                  ? "bg-[var(--ln-rec-soft)] text-[var(--ln-rec)]"
                  : "bg-[var(--ln-surface)] text-[var(--ln-text)] border border-[var(--ln-hairline)]"
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast requires ToastProvider");
  return ctx;
}
