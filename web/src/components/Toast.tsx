'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'info' | 'success' | 'error' | 'loading';

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** ms; ignored for loading (persist until dismissed). Default 4000. */
  durationMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
  variant: ToastVariant;
};

type ToastApi = {
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
  update: (id: string, patch: Partial<ToastInput>) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'loading') {
    return (
      <span
        className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/25 border-t-sky-300"
        aria-hidden
      />
    );
  }
  if (variant === 'success') {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-emerald-300" aria-hidden>
        ✓
      </span>
    );
  }
  if (variant === 'error') {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-rose-300" aria-hidden>
        !
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-sky-300" aria-hidden>
      i
    </span>
  );
}

function variantBorder(variant: ToastVariant): string {
  switch (variant) {
    case 'success':
      return 'border-emerald-400/30';
    case 'error':
      return 'border-rose-400/35';
    case 'loading':
      return 'border-sky-400/30';
    default:
      return 'border-[#4a4e57]';
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setItems((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimer],
  );

  const scheduleAutoDismiss = useCallback(
    (id: string, variant: ToastVariant, durationMs?: number) => {
      clearTimer(id);
      if (variant === 'loading') return;
      const ms = durationMs ?? 4000;
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ms),
      );
    },
    [clearTimer, dismiss],
  );

  const push = useCallback(
    (toast: ToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const variant = toast.variant ?? 'info';
      const item: ToastItem = {
        id,
        title: toast.title,
        description: toast.description,
        variant,
        durationMs: toast.durationMs,
      };
      setItems((prev) => [...prev, item]);
      scheduleAutoDismiss(id, variant, toast.durationMs);
      return id;
    },
    [scheduleAutoDismiss],
  );

  const update = useCallback(
    (id: string, patch: Partial<ToastInput>) => {
      setItems((prev) => {
        const next = prev.map((t) => {
          if (t.id !== id) return t;
          const variant = patch.variant ?? t.variant;
          return {
            ...t,
            ...patch,
            variant,
          };
        });
        const updated = next.find((t) => t.id === id);
        if (updated) {
          scheduleAutoDismiss(id, updated.variant, patch.durationMs ?? updated.durationMs);
        }
        return next;
      });
    },
    [scheduleAutoDismiss],
  );

  const api = useMemo(() => ({ push, dismiss, update }), [push, dismiss, update]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex gap-3 rounded-lg border bg-[#1f2124]/95 px-3.5 py-3 shadow-lg backdrop-blur ${variantBorder(t.variant)}`}
            role="status"
          >
            <ToastIcon variant={t.variant} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#e8eaed]">{t.title}</p>
              {t.description ? (
                <p className="mt-0.5 text-xs leading-relaxed text-[#8b919a]">{t.description}</p>
              ) : null}
            </div>
            {t.variant !== 'loading' ? (
              <button
                type="button"
                className="shrink-0 text-xs text-[#8b919a] hover:text-[#e8eaed]"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
