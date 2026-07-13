import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  PreviewInstancesService,
  type InstanceListItem,
} from '../preview-instances/preview-instances.service';

const execFileAsync = promisify(execFile);

@Injectable()
export class InstancesService {
  private readonly log = new Logger(InstancesService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly previewInstances: PreviewInstancesService,
  ) {}

  async listForApi(): Promise<InstanceListItem[]> {
    const maps = await this.previewInstances.fetchRuntimeMaps();
    return this.previewInstances.findAllForApi(maps);
  }

  async getOneForApi(id: string): Promise<InstanceListItem> {
    const maps = await this.previewInstances.fetchRuntimeMaps();
    return this.previewInstances.findOneForApi(id, maps);
  }

  async pause(id: string): Promise<InstanceListItem> {
    return this.previewInstances.pauseInstance(id);
  }

  async activate(id: string): Promise<InstanceListItem> {
    return this.previewInstances.activateOrRedeployInstance(id);
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.previewInstances.destroyInstanceById(id);
    return { ok: true };
  }

  async logsForInstance(id: string, lines: number): Promise<{
    pm2Name: string;
    lines: number;
    output: string;
  }> {
    const row = await this.previewInstances.findEntityById(id);
    if (!row) {
      throw new NotFoundException(`Instância "${id}" não encontrada`);
    }
    const safeLines = Math.min(Math.max(lines, 10), 2000);
    const name = row.pm2Name.replace(/[^\w.-]/g, '');
    if (name !== row.pm2Name) {
      throw new NotFoundException('Nome PM2 inválido');
    }
    if (row.status !== 'active') {
      return {
        pm2Name: name,
        lines: safeLines,
        output: `Sem processo ativo para esta instância (status: ${row.status}). Use “Ativar / redeploy” na página da instância quando houver vaga.`,
      };
    }
    try {
      if (row.runner === 'docker') {
        const { stdout, stderr } = await execFileAsync(
          'docker',
          ['logs', '--tail', String(safeLines), name],
          {
            maxBuffer: 10 * 1024 * 1024,
            env: { ...process.env },
          },
        );
        const out = [stdout, stderr].filter(Boolean).join('\n');
        return { pm2Name: name, lines: safeLines, output: out || '(sem saída)' };
      }

      const { stdout, stderr } = await execFileAsync(
        'pm2',
        ['logs', name, '--lines', String(safeLines), '--nostream'],
        {
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env },
        },
      );
      const out = [stdout, stderr].filter(Boolean).join('\n');
      return { pm2Name: name, lines: safeLines, output: out || '(sem saída)' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const backend = row.runner === 'docker' ? 'Docker' : 'PM2';
      this.log.warn(`${backend} logs ${name}: ${msg}`);
      return {
        pm2Name: name,
        lines: safeLines,
        output: `Não foi possível obter logs do ${backend}.\n${msg}`,
      };
    }
  }
}
