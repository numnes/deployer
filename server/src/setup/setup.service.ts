import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { access, readdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type NginxCheckItem = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type NginxCheckResult = {
  ok: boolean;
  locationsDir: string;
  checks: NginxCheckItem[];
};

@Injectable()
export class SetupService {
  constructor(private readonly config: ConfigService) {}

  private locationsDir(): string {
    return (
      this.config.get<string>('DEPLOYER_LOCATIONS_DIR') ||
      join(homedir(), 'deployer', 'locations')
    );
  }

  async checkNginx(): Promise<NginxCheckResult> {
    const locationsDir = this.locationsDir();
    const checks: NginxCheckItem[] = [];

    let dirOk = false;
    try {
      await access(locationsDir);
      dirOk = true;
      checks.push({
        id: 'locations_dir',
        label: 'Diretório de locations',
        ok: true,
        detail: locationsDir,
      });
    } catch {
      checks.push({
        id: 'locations_dir',
        label: 'Diretório de locations',
        ok: false,
        detail: `Não encontrado: ${locationsDir}`,
      });
    }

    if (dirOk) {
      try {
        const files = await readdir(locationsDir);
        const locations = files.filter((f) => f.endsWith('.location'));
        checks.push({
          id: 'location_files',
          label: 'Arquivos *.location',
          ok: true,
          detail:
            locations.length > 0
              ? `${locations.length} arquivo(s): ${locations.slice(0, 5).join(', ')}${locations.length > 5 ? '…' : ''}`
              : 'Nenhum ainda (normal antes do primeiro deploy)',
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        checks.push({
          id: 'location_files',
          label: 'Arquivos *.location',
          ok: false,
          detail: msg,
        });
      }
    }

    try {
      const { stdout, stderr } = await execFileAsync('nginx', ['-t'], {
        env: { ...process.env },
        maxBuffer: 1024 * 1024,
      });
      const out = [stdout, stderr].filter(Boolean).join('\n').trim();
      checks.push({
        id: 'nginx_test',
        label: 'nginx -t (sintaxe)',
        ok: true,
        detail: out || 'configuração OK',
      });
    } catch (e) {
      const err = e as { message?: string; stderr?: string; stdout?: string };
      const out = [err.stdout, err.stderr, err.message]
        .filter(Boolean)
        .join('\n')
        .trim();
      checks.push({
        id: 'nginx_test',
        label: 'nginx -t (sintaxe)',
        ok: false,
        detail: out || 'nginx -t falhou',
      });
    }

    try {
      await execFileAsync('pgrep', ['-x', 'nginx'], { env: { ...process.env } });
      checks.push({
        id: 'nginx_running',
        label: 'Processo nginx',
        ok: true,
        detail: 'nginx em execução',
      });
    } catch {
      checks.push({
        id: 'nginx_running',
        label: 'Processo nginx',
        ok: false,
        detail: 'nginx não está rodando (ou pgrep indisponível)',
      });
    }

    const snippet = join(locationsDir, 'nginx-server-snippet.conf');
    try {
      await access(snippet);
      checks.push({
        id: 'snippet',
        label: 'Snippet server (opcional)',
        ok: true,
        detail: snippet,
      });
    } catch {
      checks.push({
        id: 'snippet',
        label: 'Snippet server (opcional)',
        ok: true,
        detail: `Não gerado ainda. Rode: core/bin/setup-nginx.sh <domínio>`,
      });
    }

    const criticalOk = checks
      .filter((c) => c.id === 'locations_dir' || c.id === 'nginx_test' || c.id === 'nginx_running')
      .every((c) => c.ok);

    return {
      ok: criticalOk,
      locationsDir,
      checks,
    };
  }
}
