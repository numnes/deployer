/** Nomes de env que recebem a porta alocada no deploy (nginx ↔ processo). */
export const DEFAULT_PORT_ENV_NAMES = ['PORT', 'SERVER_PORT', 'APP_PORT'] as const;

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Une defaults com nomes extras do projeto / yaml.
 * Sempre inclui PORT, SERVER_PORT e APP_PORT.
 */
export function resolvePortEnvNames(
  extra?: string[] | null | undefined,
): string[] {
  const out: string[] = [...DEFAULT_PORT_ENV_NAMES];
  const seen = new Set<string>(out);
  if (!extra?.length) return out;
  for (const raw of extra) {
    const key = String(raw ?? '').trim();
    if (!key || !KEY_RE.test(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function isPortEnvNamesList(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  return value.every((v) => typeof v === 'string' && KEY_RE.test(v.trim()));
}

/** Aceita array ou string "A,B,C" / linhas. */
export function normalizePortEnvNamesInput(value: unknown): string[] | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const parts = value
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return resolvePortEnvNames(parts).filter(
      (k) => !(DEFAULT_PORT_ENV_NAMES as readonly string[]).includes(k),
    );
  }
  if (!Array.isArray(value)) return null;
  const extras = value
    .map((v) => String(v ?? '').trim())
    .filter((k) => k && KEY_RE.test(k));
  // Persist only extras beyond defaults (defaults always applied at deploy).
  return extras.filter(
    (k) => !(DEFAULT_PORT_ENV_NAMES as readonly string[]).includes(k),
  );
}
