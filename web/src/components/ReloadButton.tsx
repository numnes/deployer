'use client';

import { useState } from 'react';
import { IconRefresh } from './icons';

/**
 * Botão de reload que gira o ícone enquanto o `onReload` está em andamento
 * e para assim que a promise resolve/rejeita.
 */
export function ReloadButton({
  onReload,
  title = 'Reload',
  className = '',
  disabled = false,
}: {
  onReload: () => void | Promise<void>;
  title?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      await onReload();
    } catch {
      // Erros de carregamento são tratados pela página que chamou.
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`btn p-2 ${className}`}
      onClick={handleClick}
      disabled={busy || disabled}
      aria-label={title}
      aria-busy={busy}
      title={title}
    >
      <IconRefresh className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
    </button>
  );
}
