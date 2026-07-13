import {
  activeLifetimePausedHint,
  lifetimeExpiryDisplay,
} from '@/lib/instance-lifetime';
import type { InstanceRow } from './::handlers/instances';

function ExpiryLine({
  label,
  iso,
  hint,
}: {
  label: string;
  iso: string | null | undefined;
  hint?: string | null;
}) {
  const d = lifetimeExpiryDisplay(iso);
  return (
    <div className="text-xs leading-snug" title={hint ? `${d.title} · ${hint}` : d.title}>
      <span className="text-white/45">{label}: </span>
      <span
        className={
          d.expired
            ? 'text-rose-300/90'
            : iso
              ? 'text-white/75'
              : 'text-white/40'
        }
      >
        {hint && !iso ? hint : d.text}
      </span>
    </div>
  );
}

export function InstanceLifetimeCell({ row }: { row: InstanceRow }) {
  const pausedHint = activeLifetimePausedHint(
    row.status,
    row.hasActiveLifetimeLimit,
    row.activeExpiresAt,
  );
  return (
    <div className="min-w-[7.5rem] space-y-0.5">
      <ExpiryLine label="Pause" iso={row.activeExpiresAt} hint={pausedHint} />
      <ExpiryLine label="Remove" iso={row.existenceExpiresAt} />
    </div>
  );
}
