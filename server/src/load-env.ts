import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:deployer@localhost:5432/deployer';

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** PM2 may inject empty env vars; Nest/dotenv skip overriding existing keys. */
export function patchEmptyEnvFromFile(): void {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    if (!process.env.DATABASE_URL?.trim()) {
      process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
    }
    return;
  }

  const parsed = parseEnvFile(readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (!value) continue;
    const current = process.env[key];
    if (current === undefined || current === '') {
      process.env[key] = value;
    }
  }

  if (!process.env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL =
      parsed.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
  }
}
