/** Converte dias + horas em milissegundos. null = sem limite configurado. */
export function lifetimeDurationMs(
  days: number | null | undefined,
  hours: number | null | undefined,
): number | null {
  if (days == null && hours == null) return null;
  const d = days ?? 0;
  const h = hours ?? 0;
  if (d <= 0 && h <= 0) return null;
  return (d * 24 + h) * 60 * 60 * 1000;
}

type LifetimeProject = {
  maxActiveLifetimeDays?: number | null;
  maxActiveLifetimeHours?: number | null;
  maxExistenceLifetimeDays?: number | null;
  maxExistenceLifetimeHours?: number | null;
};

type LifetimeInstance = {
  status: string;
  createdAt: Date;
  activatedAt?: Date | null;
  updatedAt: Date;
};

/** Quando a instância ativa será pausada (null = sem limite ou não está active). */
export function computeActiveExpiresAt(
  row: LifetimeInstance,
  project: LifetimeProject,
): Date | null {
  if (row.status !== 'active') return null;
  const ms = lifetimeDurationMs(
    project.maxActiveLifetimeDays,
    project.maxActiveLifetimeHours,
  );
  if (ms == null) return null;
  const since = row.activatedAt ?? row.updatedAt;
  return new Date(since.getTime() + ms);
}

/** Quando a instância será removida (null = sem limite). */
export function computeExistenceExpiresAt(
  row: LifetimeInstance,
  project: LifetimeProject,
): Date | null {
  const ms = lifetimeDurationMs(
    project.maxExistenceLifetimeDays,
    project.maxExistenceLifetimeHours,
  );
  if (ms == null) return null;
  return new Date(row.createdAt.getTime() + ms);
}
