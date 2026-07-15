export type EnvVarsMap = Record<string, string>;

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function envVarsToDotenv(vars: EnvVarsMap): string {
  const lines: string[] = [];
  for (const key of Object.keys(vars).sort()) {
    const raw = vars[key] ?? '';
    const needsQuote =
      /[\s#"'=\\]/.test(raw) || raw === '' || raw.includes('\n') || raw.includes('\r');
    if (needsQuote) {
      const escaped = raw
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
      lines.push(`${key}="${escaped}"`);
    } else {
      lines.push(`${key}=${raw}`);
    }
  }
  return lines.length ? `${lines.join('\n')}\n` : '';
}

export function parseDotenv(text: string): EnvVarsMap {
  const out: EnvVarsMap = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!KEY_RE.test(key)) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
      value = value
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
    out[key] = value;
  }
  return out;
}

export function normalizeEnvVars(value: unknown): EnvVarsMap {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const out: EnvVarsMap = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (KEY_RE.test(k) && typeof v === 'string') out[k] = v;
  }
  return out;
}

export function mergeEnvVars(
  ...layers: Array<EnvVarsMap | null | undefined>
): EnvVarsMap {
  const out: EnvVarsMap = {};
  for (const layer of layers) {
    if (!layer) continue;
    for (const [k, v] of Object.entries(layer)) out[k] = v;
  }
  return out;
}

export function envVarsToRows(vars: EnvVarsMap): Array<{ key: string; value: string }> {
  return Object.keys(vars)
    .sort()
    .map((key) => ({ key, value: vars[key] ?? '' }));
}

export function rowsToEnvVars(
  rows: Array<{ key: string; value: string }>,
): EnvVarsMap {
  const out: EnvVarsMap = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!KEY_RE.test(key)) continue;
    out[key] = row.value;
  }
  return out;
}

function escapeDotenvValue(raw: string): string {
  const needsQuote =
    /[\s#"'=\\]/.test(raw) || raw === '' || raw.includes('\n') || raw.includes('\r');
  if (!needsQuote) return raw;
  const escaped = raw
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
  return `"${escaped}"`;
}

function unescapeDotenvValue(value: string): string {
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
    v = v
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  return v;
}

/**
 * Converte texto .env em linhas da tabela, incluindo chaves incompletas
 * (sem `=`) para o switch table/text preservar o que o usuário digitou.
 */
export function dotenvTextToRows(
  text: string,
): Array<{ key: string; value: string }> {
  const rows: Array<{ key: string; value: string }> = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) {
      rows.push({ key: trimmed, value: '' });
      continue;
    }
    if (eq === 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = unescapeDotenvValue(trimmed.slice(eq + 1));
    rows.push({ key, value });
  }
  return rows.length ? rows : [{ key: '', value: '' }];
}

/** Serializa linhas da tabela (incluindo drafts) de volta para texto .env. */
export function rowsToDotenvText(
  rows: Array<{ key: string; value: string }>,
): string {
  const lines: string[] = [];
  for (const row of rows) {
    const key = row.key.trim();
    if (!key && row.value === '') continue;
    if (!key) continue;
    lines.push(`${key}=${escapeDotenvValue(row.value)}`);
  }
  return lines.length ? `${lines.join('\n')}\n` : '';
}

export function isValidEnvKey(key: string): boolean {
  return KEY_RE.test(key);
}
