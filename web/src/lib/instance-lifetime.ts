export type LifetimeExpiryDisplay = {
  text: string;
  title: string;
  expired: boolean;
};

function formatRelative(ms: number): string {
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60_000);
  if (mins < 60) return ms < 0 ? `${mins}m ago` : `in ${mins}m`;
  const hours = Math.round(abs / 3_600_000);
  if (hours < 48) return ms < 0 ? `${hours}h ago` : `in ${hours}h`;
  const days = Math.round(abs / 86_400_000);
  return ms < 0 ? `${days}d ago` : `in ${days}d`;
}

/** Rótulo curto para expiração (lista) com data completa no tooltip. */
export function lifetimeExpiryDisplay(
  iso: string | null | undefined,
): LifetimeExpiryDisplay {
  if (!iso) {
    return { text: 'No limit', title: 'No limit configured for this project', expired: false };
  }
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) {
    return { text: '—', title: '', expired: false };
  }
  const full = at.toLocaleString('en-US');
  if (at.getTime() <= Date.now()) {
    return { text: 'Expired', title: full, expired: true };
  }
  return { text: formatRelative(at.getTime() - Date.now()), title: full, expired: false };
}

/** Texto quando instância não está active mas o projeto tem limite de tempo ativo. */
export function activeLifetimePausedHint(
  status: string,
  hasActiveLifetimeLimit: boolean,
  activeExpiresAt: string | null | undefined,
): string | null {
  if (!hasActiveLifetimeLimit || status === 'active' || activeExpiresAt) return null;
  return 'Resets on activate';
}
