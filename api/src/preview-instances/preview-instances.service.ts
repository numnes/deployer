import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DeployMeta } from '../deploy/deploy-meta';
import { runCoreDeployScript, runCorePauseScript } from '../deploy/deploy-exec.helper';
import { pm2AppName, sanitizeBranchSlug } from '../deploy/pm2-name.util';
import { PreviewInstance } from '../entities/preview-instance.entity';
import { PreviewInstanceStatusEvent } from '../entities/preview-instance-status-event.entity';
import { ProjectsService } from '../projects/projects.service';
import { fetchPm2ByName } from '../instances/pm2-list.helper';
import { SettingsService } from '../settings/settings.service';
import type { PreviewStatus } from './preview-status';

export type { DeployMeta } from '../deploy/deploy-meta';

const execFileAsync = promisify(execFile);

export type InstanceListItem = {
  id: string;
  projectId: string;
  projectSlug: string;
  projectServerUrl: string | null;
  branch: string;
  branchSlug: string;
  pm2Name: string;
  port: number | null;
  status: string;
  /** PM2 reporta processo online (pode divergir do status do banco). */
  pm2Online: boolean;
  /** @deprecated use pm2Online */
  active: boolean;
  pm2Status: string | null;
  monit?: { memory?: number; cpu?: number } | null;
  previewUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PreviewInstancesService {
  private readonly log = new Logger(PreviewInstancesService.name);

  constructor(
    @InjectRepository(PreviewInstance)
    private readonly repo: Repository<PreviewInstance>,
    @InjectRepository(PreviewInstanceStatusEvent)
    private readonly events: Repository<PreviewInstanceStatusEvent>,
    private readonly projects: ProjectsService,
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
  ) {}

  private async appendEvent(
    instanceId: string,
    oldStatus: string | null,
    newStatus: string,
  ) {
    await this.events.save(
      this.events.create({
        instanceId,
        oldStatus,
        newStatus,
      }),
    );
  }

  private async setStatus(row: PreviewInstance, next: PreviewStatus) {
    const prev = row.status;
    if (prev === next) return row;
    row.status = next;
    const saved = await this.repo.save(row);
    await this.appendEvent(saved.id, prev, next);
    return saved;
  }

  async countActiveSlots(): Promise<number> {
    return this.repo.count({ where: { status: 'active' } });
  }

  /**
   * Antes de rodar o shell: se limite global atingido e esta branch não está
   * já como active, registra (ou atualiza) como waiting e não executa deploy.
   * Caso contrário retorna que o shell deve rodar (deploy / redeploy).
   */
  async classifyDeployOrQueue(
    projectSlug: string,
    branch: string,
  ): Promise<'queued' | 'run_shell'> {
    const project = await this.projects.getBySlug(projectSlug);
    const branchSlug = sanitizeBranchSlug(branch);
    const pm2Name = pm2AppName(projectSlug, branch);
    const max = await this.settings.getMaxActiveInstances();
    const activeSlots = await this.countActiveSlots();
    let row = await this.repo.findOne({
      where: { projectId: project.id, branch },
    });

    const thisBranchIsActive = row?.status === 'active';
    if (activeSlots >= max && !thisBranchIsActive) {
      if (!row) {
        row = this.repo.create({
          projectId: project.id,
          branch,
          branchSlug,
          pm2Name,
          port: null,
          status: 'waiting',
        });
        await this.repo.save(row);
        await this.appendEvent(row.id, null, 'waiting');
      } else {
        row.branchSlug = branchSlug;
        row.pm2Name = pm2Name;
        await this.repo.save(row);
        await this.setStatus(row, 'waiting');
      }
      this.log.log(
        `Deploy enfileirado (waiting) ${projectSlug}/${branch} — limite ${max} ativo(s)`,
      );
      return 'queued';
    }
    return 'run_shell';
  }

  /** Marca deploying antes do shell (cria linha se não existir). */
  async markDeploying(projectSlug: string, branch: string): Promise<PreviewInstance> {
    const project = await this.projects.getBySlug(projectSlug);
    const branchSlug = sanitizeBranchSlug(branch);
    const pm2Name = pm2AppName(projectSlug, branch);
    let row = await this.repo.findOne({
      where: { projectId: project.id, branch },
    });
    if (!row) {
      row = this.repo.create({
        projectId: project.id,
        branch,
        branchSlug,
        pm2Name,
        port: null,
        status: 'deploying',
      });
      await this.repo.save(row);
      await this.appendEvent(row.id, null, 'deploying');
    } else {
      row.branchSlug = branchSlug;
      row.pm2Name = pm2Name;
      await this.repo.save(row);
      await this.setStatus(row, 'deploying');
    }
    return row;
  }

  async finalizeDeploySuccess(meta: DeployMeta): Promise<PreviewInstance> {
    const project = await this.projects.getBySlug(meta.projectSlug);
    const row = await this.repo.findOne({
      where: { projectId: project.id, branch: meta.branch },
    });
    if (!row) {
      throw new Error('Instância em deploying não encontrada após shell');
    }
    row.branchSlug = meta.branchSlug;
    row.pm2Name = meta.pm2Name;
    row.port = meta.port;
    await this.repo.save(row);
    await this.setStatus(row, 'active');
    return (await this.repo.findOne({ where: { id: row.id } })) as PreviewInstance;
  }

  async finalizeDeployError(projectSlug: string, branch: string): Promise<void> {
    try {
      const project = await this.projects.getBySlug(projectSlug);
      const row = await this.repo.findOne({
        where: { projectId: project.id, branch },
      });
      if (row) {
        await this.setStatus(row, 'error');
      }
    } catch {
      /* ignore */
    }
  }

  /** Tenta subir instâncias waiting enquanto houver vaga. */
  async processWaitingQueue(): Promise<void> {
    const max = await this.settings.getMaxActiveInstances();
    while ((await this.countActiveSlots()) < max) {
      const next = await this.repo.findOne({
        where: { status: 'waiting' },
        relations: ['project'],
        order: { createdAt: 'ASC' },
      });
      if (!next?.project) break;
      const gitUrl = next.project.gitUrl;
      const slug = next.project.slug;
      try {
        await this.setStatus(next, 'deploying');
        const meta = await runCoreDeployScript(this.config, slug, gitUrl, next.branch);
        await this.finalizeDeploySuccess(meta);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.log.error(`Fila waiting falhou (${slug}/${next.branch}): ${msg}`);
        await this.setStatus(next, 'error');
      }
    }
  }

  async upsertAfterDeploy(meta: DeployMeta): Promise<PreviewInstance> {
    return this.finalizeDeploySuccess(meta);
  }

  async removeByProjectSlugAndBranch(
    projectSlug: string,
    branch: string,
  ): Promise<void> {
    try {
      const project = await this.projects.getBySlug(projectSlug);
      const row = await this.repo.findOne({
        where: { projectId: project.id, branch },
      });
      if (row) {
        await this.appendEvent(row.id, row.status, 'deleted');
        await this.repo.delete({ id: row.id });
      }
    } catch (e) {
      if (e instanceof NotFoundException) {
        return;
      }
      throw e;
    }
    await this.processWaitingQueue();
  }

  /**
   * Remove a instância (destroy do runtime + remoção do registro no banco).
   * - Se existir, executa `core/bin/destroy.sh <projectSlug> <branch>`
   * - Registra evento `deleted` e remove a linha
   * - Processa a fila waiting ao liberar vaga
   */
  async destroyInstanceById(id: string): Promise<void> {
    const row = await this.repo.findOne({ where: { id }, relations: ['project'] });
    if (!row || !row.project) {
      throw new NotFoundException(`Instância "${id}" não encontrada`);
    }

    const coreDir =
      this.config.get<string>('DEPLOYER_CORE_DIR') ||
      join(__dirname, '..', '..', '..', 'core');
    const workRoot = this.config.get<string>('DEPLOYER_WORK_ROOT');
    if (!workRoot) {
      throw new Error('DEPLOYER_WORK_ROOT não configurado');
    }
    const binDir = join(coreDir, 'bin');
    const env = { ...process.env, DEPLOYER_WORK_ROOT: workRoot };
    const script = join(binDir, 'destroy.sh');

    await execFileAsync(script, [row.project.slug, row.branch], { env });
    await this.appendEvent(row.id, row.status, 'deleted');
    await this.repo.delete({ id: row.id });
    await this.processWaitingQueue();
  }

  private buildListItem(
    r: PreviewInstance,
    pm2?: {
      status: string | null;
      monit?: { memory?: number; cpu?: number };
    },
  ): InstanceListItem {
    const pm2Online =
      !!pm2 && typeof pm2.status === 'string' && pm2.status === 'online';
    const base = r.project?.serverUrl?.trim();
    const previewUrl =
      base && r.branchSlug
        ? `${base.replace(/\/+$/, '')}/${r.branchSlug}/`
        : null;
    return {
      id: r.id,
      projectId: r.projectId,
      projectSlug: r.project?.slug ?? '',
      projectServerUrl: r.project?.serverUrl ?? null,
      branch: r.branch,
      branchSlug: r.branchSlug,
      pm2Name: r.pm2Name,
      port: r.port,
      status: r.status,
      pm2Online,
      active: pm2Online,
      pm2Status: pm2?.status ?? null,
      monit: pm2?.monit ?? null,
      previewUrl,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async findAllForApi(
    pm2ByName: Map<
      string,
      { status: string | null; monit?: { memory?: number; cpu?: number } }
    >,
  ): Promise<InstanceListItem[]> {
    const rows = await this.repo.find({
      relations: ['project'],
      order: { updatedAt: 'DESC' },
    });
    return rows.map((r) => this.buildListItem(r, pm2ByName.get(r.pm2Name)));
  }

  async findOneForApi(
    id: string,
    pm2ByName: Map<
      string,
      { status: string | null; monit?: { memory?: number; cpu?: number } }
    >,
  ): Promise<InstanceListItem> {
    const r = await this.repo.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!r) {
      throw new NotFoundException(`Instância "${id}" não encontrada`);
    }
    return this.buildListItem(r, pm2ByName.get(r.pm2Name));
  }

  async findEntityById(id: string): Promise<PreviewInstance | null> {
    return this.repo.findOne({ where: { id } });
  }

  async pauseInstance(id: string): Promise<InstanceListItem> {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!row?.project) throw new NotFoundException();
    if (row.status !== 'active') {
      throw new BadRequestException('Só é possível pausar instâncias ativas');
    }
    await runCorePauseScript(this.config, row.project.slug, row.branch);
    await this.setStatus(row, 'paused');
    await this.processWaitingQueue();
    const pm2 = await fetchPm2ByName(this.config);
    const fresh = await this.repo.findOne({ where: { id }, relations: ['project'] });
    return this.buildListItem(fresh as PreviewInstance, pm2.get(fresh!.pm2Name));
  }

  async activateOrRedeployInstance(id: string): Promise<InstanceListItem> {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!row?.project) throw new NotFoundException();
    if (row.status === 'active') {
      await this.setStatus(row, 'deploying');
      try {
        const meta = await runCoreDeployScript(
          this.config,
          row.project.slug,
          row.project.gitUrl,
          row.branch,
        );
        await this.finalizeDeploySuccess(meta);
      } catch (e) {
        await this.finalizeDeployError(row.project.slug, row.branch);
        throw e;
      }
      await this.processWaitingQueue();
    } else if (
      row.status === 'waiting' ||
      row.status === 'paused' ||
      row.status === 'error'
    ) {
      const max = await this.settings.getMaxActiveInstances();
      const active = await this.countActiveSlots();
      if (active >= max) {
        await this.setStatus(row, 'waiting');
        const pm2 = await fetchPm2ByName(this.config);
        const fresh = await this.repo.findOne({
          where: { id },
          relations: ['project'],
        });
        return this.buildListItem(fresh as PreviewInstance, pm2.get(fresh!.pm2Name));
      }
      await this.setStatus(row, 'deploying');
      try {
        const meta = await runCoreDeployScript(
          this.config,
          row.project.slug,
          row.project.gitUrl,
          row.branch,
        );
        await this.finalizeDeploySuccess(meta);
      } catch (e) {
        await this.finalizeDeployError(row.project.slug, row.branch);
        throw e;
      }
      await this.processWaitingQueue();
    } else {
      throw new BadRequestException(
        `Estado "${row.status}" não suporta ativação forçada agora`,
      );
    }
    const pm2 = await fetchPm2ByName(this.config);
    const fresh = await this.repo.findOne({ where: { id }, relations: ['project'] });
    return this.buildListItem(fresh as PreviewInstance, pm2.get(fresh!.pm2Name));
  }

  async findAllByProjectId(projectId: string): Promise<PreviewInstance[]> {
    return this.repo.find({
      where: { projectId },
      relations: ['project'],
      order: { updatedAt: 'DESC' },
    });
  }

  async destroyAllForProject(projectId: string): Promise<{
    destroyed: number;
    failed: number;
  }> {
    const rows = await this.findAllByProjectId(projectId);
    let destroyed = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await this.destroyInstanceById(row.id);
        destroyed++;
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        this.log.warn(`destroy ${row.id}: ${msg}`);
      }
    }
    return { destroyed, failed };
  }

  async pauseAllActiveForProject(projectId: string): Promise<{
    paused: number;
    skipped: number;
    failed: number;
  }> {
    const rows = await this.findAllByProjectId(projectId);
    let paused = 0;
    let skipped = 0;
    let failed = 0;
    for (const row of rows) {
      if (row.status !== 'active') {
        skipped++;
        continue;
      }
      try {
        await this.pauseInstance(row.id);
        paused++;
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        this.log.warn(`pause ${row.id}: ${msg}`);
      }
    }
    return { paused, skipped, failed };
  }

  async restartAllForProject(projectId: string): Promise<{
    restarted: number;
    skipped: number;
    failed: number;
  }> {
    const rows = await this.findAllByProjectId(projectId);
    let restarted = 0;
    let skipped = 0;
    let failed = 0;
    for (const row of rows) {
      if (!['active', 'paused', 'waiting', 'error'].includes(row.status)) {
        skipped++;
        continue;
      }
      try {
        await this.activateOrRedeployInstance(row.id);
        restarted++;
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        this.log.warn(`restart ${row.id}: ${msg}`);
      }
    }
    return { restarted, skipped, failed };
  }
}
