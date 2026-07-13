import { timingSafeEqual } from 'crypto';

export const SETUP_KEY_HEADER = 'x-deployer-setup-key';

/** Comparação de strings resistente a timing attacks. */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** Extrai o valor do header da setup key (aceita string ou array). */
export function extractSetupKey(
  headers: Record<string, string | string[] | undefined>,
): string {
  const raw = headers[SETUP_KEY_HEADER];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0] ?? '';
  return '';
}

/** Valida a chave fornecida contra a esperada (configurada na máquina root). */
export function isValidSetupKey(provided: string, expected: string): boolean {
  if (!expected || !provided) return false;
  return timingSafeEqualStr(provided, expected);
}
