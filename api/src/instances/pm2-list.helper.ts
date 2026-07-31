import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

type Pm2Row = {
  name?: string;
  status?: string | null;
  monit?: { memory?: number; cpu?: number };
};

export async function fetchPm2ByName(
  config: ConfigService,
): Promise<
  Map<string, { status: string | null; monit?: { memory?: number; cpu?: number } }>
> {
  const coreDir =
    config.get<string>('DEPLOYER_CORE_DIR') ||
    join(__dirname, '..', '..', '..', 'core');
  const script = join(coreDir, 'bin', 'list-instances.sh');
  let rows: Pm2Row[] = [];
  try {
    const { stdout } = await execFileAsync(script, [], {
      env: { ...process.env },
    });
    rows = JSON.parse(stdout.trim() || '[]') as Pm2Row[];
  } catch {
    rows = [];
  }
  const map = new Map<
    string,
    { status: string | null; monit?: { memory?: number; cpu?: number } }
  >();
  for (const r of rows) {
    if (r.name) {
      map.set(r.name, { status: r.status ?? null, monit: r.monit });
    }
  }
  // Alias órfãos legados `canonical.eco.XXXX` → canonical (para status na UI).
  for (const r of rows) {
    const n = r.name;
    if (!n) continue;
    const m = /^(.*)\.eco\.[A-Za-z0-9]+$/.exec(n);
    if (!m) continue;
    const canonical = m[1];
    const existing = map.get(canonical);
    const row = { status: r.status ?? null, monit: r.monit };
    if (!existing) {
      map.set(canonical, row);
      continue;
    }
    // Prefere online sobre errored/stopped.
    if (existing.status !== 'online' && row.status === 'online') {
      map.set(canonical, row);
    }
  }
  return map;
}
