import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type DockerRuntimeInfo = {
  running: boolean;
  status: string | null;
};

/**
 * Retorna um mapa nome-do-container -> estado, lido de `docker ps -a`.
 * Usado para instâncias cujo runner é "docker" (equivalente ao pm2 jlist).
 */
export async function fetchDockerByName(
  config: ConfigService,
): Promise<Map<string, DockerRuntimeInfo>> {
  void config;
  const map = new Map<string, DockerRuntimeInfo>();
  try {
    const { stdout } = await execFileAsync(
      'docker',
      ['ps', '-a', '--no-trunc', '--format', '{{.Names}}\t{{.State}}\t{{.Status}}'],
      { env: { ...process.env }, maxBuffer: 4 * 1024 * 1024 },
    );
    for (const line of stdout.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [name, state, status] = trimmed.split('\t');
      if (!name) continue;
      map.set(name, {
        running: state === 'running',
        status: status ?? state ?? null,
      });
    }
  } catch {
    // docker indisponível: devolve mapa vazio (instâncias aparecem offline).
  }
  return map;
}
