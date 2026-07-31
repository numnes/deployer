import type { UserRole } from '../auth/user-role';

/** Campos de env sensíveis nas respostas de instância. */
const INSTANCE_ENV_KEYS = ['envVars', 'projectEnvVars'] as const;

export function redactInstanceEnvFields<T extends Record<string, unknown>>(
  item: T,
  role: UserRole | undefined,
): T {
  if (role === 'admin') return item;
  const next = { ...item };
  for (const key of INSTANCE_ENV_KEYS) {
    if (key in next) {
      (next as Record<string, unknown>)[key] = {};
    }
  }
  return next;
}

export function redactInstanceEnvList<T extends Record<string, unknown>>(
  items: T[],
  role: UserRole | undefined,
): T[] {
  if (role === 'admin') return items;
  return items.map((item) => redactInstanceEnvFields(item, role));
}
