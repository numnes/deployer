import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ClusterAggregatorService } from '../cluster/cluster-aggregator.service';
import { parseRemoteId } from '../cluster/cluster.types';
import {
  PreviewInstancesService,
  type InstanceListItem,
} from '../preview-instances/preview-instances.service';
import type { UpdateInstanceDto } from './dto/update-instance.dto';

const execFileAsync = promisify(execFile);

@Injectable()
export class InstancesService {
  private readonly log = new Logger(InstancesService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly previewInstances: PreviewInstancesService,
    private readonly cluster: ClusterAggregatorService,
  ) {}

  async listLocalForApi(): Promise<InstanceListItem[]> {
    const maps = await this.previewInstances.fetchRuntimeMaps();
    return this.previewInstances.findAllForApi(maps);
  }

  async getLocalOneForApi(id: string): Promise<InstanceListItem> {
    const maps = await this.previewInstances.fetchRuntimeMaps();
    return this.previewInstances.findOneForApi(id, maps);
  }

  async listForApi() {
    return this.cluster.aggregateInstances();
  }

  async getOneForApi(id: string) {
    const remote = parseRemoteId(id);
    if (remote) {
      return this.cluster.getRemoteInstance(remote.nodeId, remote.remoteId);
    }
    const maps = await this.previewInstances.fetchRuntimeMaps();
    const row = await this.previewInstances.findOneForApi(id, maps);
    return this.cluster.tagLocal(row);
  }

  async update(id: string, dto: UpdateInstanceDto): Promise<InstanceListItem> {
    const remote = parseRemoteId(id);
    if (remote) {
      throw new NotFoundException(
        'Override de env em instâncias remotas ainda não é suportado; edite no nó de origem',
      );
    }
    if (dto.envVars === undefined) {
      return this.getOneForApi(id);
    }
    const row = await this.previewInstances.updateEnvVars(id, dto.envVars);
    return this.cluster.tagLocal(row);
  }

  async pause(id: string): Promise<InstanceListItem> {
    const remote = parseRemoteId(id);
    if (remote) {
      return this.cluster.pauseRemoteInstance(remote.nodeId, remote.remoteId);
    }
    const row = await this.previewInstances.pauseInstance(id);
    return this.cluster.tagLocal(row);
  }

  async activate(id: string): Promise<InstanceListItem> {
    const remote = parseRemoteId(id);
    if (remote) {
      return this.cluster.activateRemoteInstance(remote.nodeId, remote.remoteId);
    }
    const row = await this.previewInstances.activateOrRedeployInstance(id);
    return this.cluster.tagLocal(row);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const remote = parseRemoteId(id);
    if (remote) {
      return this.cluster.removeRemoteInstance(remote.nodeId, remote.remoteId);
    }
    await this.previewInstances.destroyInstanceById(id);
    return { ok: true };
  }

  async logsForInstance(id: string, lines: number): Promise<{
    pm2Name: string;
    lines: number;
    output: string;
  }> {
    const remote = parseRemoteId(id);
    if (remote) {
      return this.cluster.remoteInstanceLogs(
        remote.nodeId,
        remote.remoteId,
        lines,
      );
    }
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
