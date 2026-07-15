import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { execFile } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  isEnvVarsMap,
  normalizeEnvVars,
  type EnvVarsMap,
} from '../common/env-vars.util';
import type { DeployMeta } from '../deploy/deploy-meta';
import type { DeployJobPayload } from '../deploy/deploy.processor';
import { formatDeployError } from '../deploy/format-deploy-error';
import {
  runCoreDeployScript,
  runCorePauseScript,
  type DeployAppEnvInput,
} from '../deploy/deploy-exec.helper';
import { pm2AppName, sanitizeBranchSlug } from '../deploy/pm2-name.util';
import { PreviewInstance } from '../entities/preview-instance.entity';
import { PreviewInstanceStatusEvent } from '../entities/preview-instance-status-event.entity';
import { ProjectsService } from '../projects/projects.service';
import { fetchPm2ByName } from '../instances/pm2-list.helper';
import { fetchDockerByName } from '../instances/docker-list.helper';
import { SettingsService } from '../settings/settings.service';
import type { PreviewStatus } from './preview-status';
import {
  computeActiveExpiresAt,
  computeExistenceExpiresAt,
  lifetimeDurationMs,
} from './instance-lifetime.util';

export type { DeployMeta } from '../deploy/deploy-meta';

const execFileAsync = promisify(execFile);

export type RuntimeInfo = {
  online: boolean;
  status: string | null;
  monit?: { memory?: number; cpu?: number } | null;
};

export type RuntimeMaps = {
  pm2: Map<string, { status: string | null; monit?: { memory?: number; cpu?: number } }>;
  docker: Map<string, { running: boolean; status: string | null }>;
};

export type InstanceListItem = {
  id: string;
  projectId: string;
  projectSlug: string;
  projectServerUrl: string | null;
  branch: string;
  branchSlug: string;
  pm2Name: string;
  /** Nome do processo/container em execução (pm2 name ou docker container). */
  runtimeName: string;
  /** pm2 | docker */
  runner: string;
  port: number | null;
  status: string;
  /** Runtime (pm2 ou docker) reporta processo online (pode divergir do status do banco). */
  runtimeOnline: boolean;
  /** Status bruto do runtime (ex.: "online" no pm2, "Up 2 minutes" no docker). */
  runtimeStatus: string | null;
  /** @deprecated use runtimeOnline */
  pm2Online: boolean;
  /** @deprecated use runtimeOnline */
  active: boolean;
  /** @deprecated use runtimeStatus */
  pm2Status: string | null;
  monit?: { memory?: number; cpu?: number } | null;
  previewUrl: string | null;
  /** Mensagem do último deploy com falha (status error). */
  lastDeployError: string | null;
  /** Pausa automática quando active (ISO). null = sem limite ou não está active. */
  activeExpiresAt: Date | null;
  /** Remoção automática desde criação (ISO). null = sem limite. */
  existenceExpiresAt: Date | null;
  hasActiveLifetimeLimit: boolean;
  hasExistenceLifetimeLimit: boolean;
  /** Override de env desta instância. */
  envVars: EnvVarsMap;
  /** Envs padrão do projeto (antes do merge com envVars). */
  projectEnvVars: EnvVarsMap;
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
    @Inject(forwardRef(() => ProjectsService))
    private readonly projects: ProjectsService,
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
    @InjectQueue('deploy')
    private readonly deployQueue: Queue<DeployJobPayload>,
  ) {}

  private async enqueueRedeployJob(projectSlug: string, branch: string, gitUrl: string) {
    await this.deployQueue.add('create', {
      projectSlug,
      branch,
      gitUrl,
    });
  }
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
    if (next === 'active') {
      row.activatedAt = new Date();
    }
    const saved = await this.repo.save(row);
    await this.appendEvent(saved.id, prev, next);
    return saved;
  }

  async countActiveSlots(): Promise<number> {
    return this.repo.count({ where: { status: 'active' } });
  }

  /** Envs do projeto (+ override da instância se já existir) para o shell de deploy. */
  async resolveDeployAppEnv(
    projectSlug: string,
    branch: string,
  ): Promise<DeployAppEnvInput> {
    const project = await this.projects.getBySlug(projectSlug);
    const row = await this.repo.findOne({
      where: { projectId: project.id, branch },
    });
    return {
      projectEnv: normalizeEnvVars(project.envVars),
      instanceEnv: normalizeEnvVars(row?.envVars),
    };
  }

  async updateEnvVars(id: string, envVars: unknown): Promise<InstanceListItem> {
    if (!isEnvVarsMap(envVars)) {
      throw new BadRequestException(
        'envVars inválido: chaves devem ser nomes de env ([A-Za-z_][A-Za-z0-9_]*) e valores string',
      );
    }
    const row = await this.repo.findOne({ where: { id }, relations: ['project'] });
    if (!row?.project) {
      throw new NotFoundException(`Instância "${id}" não encontrada`);
    }
    row.envVars = normalizeEnvVars(envVars);
    await this.repo.save(row);
    const maps = await this.fetchRuntimeMaps();
    const fresh = await this.repo.findOne({ where: { id }, relations: ['project'] });
    return this.buildListItem(fresh as PreviewInstance, maps);
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
        lastDeployError: null,
      });
      await this.repo.save(row);
      await this.appendEvent(row.id, null, 'deploying');
    } else {
      row.branchSlug = branchSlug;
      row.pm2Name = pm2Name;
      row.lastDeployError = null;
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
    row.runner = meta.runner ?? 'pm2';
    row.lastDeployError = null;
    await this.repo.save(row);
    await this.setStatus(row, 'active');
    return (await this.repo.findOne({ where: { id: row.id } })) as PreviewInstance;
  }

  async finalizeDeployError(
    projectSlug: string,
    branch: string,
    deployError: string,
  ): Promise<void> {
    try {
      const project = await this.projects.getBySlug(projectSlug);
      const row = await this.repo.findOne({
        where: { projectId: project.id, branch },
      });
      if (row) {
        row.lastDeployError = deployError;
        await this.repo.save(row);
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
        const appEnv = await this.resolveDeployAppEnv(slug, next.branch);
        const meta = await runCoreDeployScript(
          this.config,
          slug,
          gitUrl,
          next.branch,
          undefined,
          appEnv,
        );
        await this.finalizeDeploySuccess(meta);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.log.error(`Fila waiting falhou (${slug}/${next.branch}): ${msg}`);
        await this.finalizeDeployError(slug, next.branch, formatDeployError(e));
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

  /** Busca o estado de runtime (pm2 + docker) em paralelo. */
  async fetchRuntimeMaps(): Promise<RuntimeMaps> {
    const [pm2, docker] = await Promise.all([
      fetchPm2ByName(this.config),
      fetchDockerByName(this.config),
    ]);
    return { pm2, docker };
  }

  /** Resolve o runtime da instância conforme o runner gravado no banco. */
  private resolveRuntime(r: PreviewInstance, maps: RuntimeMaps): RuntimeInfo {
    if (r.runner === 'docker') {
      const d = maps.docker.get(r.pm2Name);
      return {
        online: d?.running ?? false,
        status: d?.status ?? null,
        monit: null,
      };
    }
    const p = maps.pm2.get(r.pm2Name);
    return {
      online: !!p && p.status === 'online',
      status: p?.status ?? null,
      monit: p?.monit ?? null,
    };
  }

  private buildListItem(r: PreviewInstance, maps: RuntimeMaps): InstanceListItem {
    const runtime = this.resolveRuntime(r, maps);
    const base = r.project?.serverUrl?.trim();
    const previewUrl =
      base && r.pm2Name
        ? `${base.replace(/\/+$/, '')}/${r.pm2Name}/`
        : null;
    const project = r.project;
    const activeExpiresAt =
      project != null ? computeActiveExpiresAt(r, project) : null;
    const existenceExpiresAt =
      project != null ? computeExistenceExpiresAt(r, project) : null;
    const hasActiveLifetimeLimit =
      project != null &&
      lifetimeDurationMs(
        project.maxActiveLifetimeDays,
        project.maxActiveLifetimeHours,
      ) != null;
    const hasExistenceLifetimeLimit =
      project != null &&
      lifetimeDurationMs(
        project.maxExistenceLifetimeDays,
        project.maxExistenceLifetimeHours,
      ) != null;
    return {
      id: r.id,
      projectId: r.projectId,
      projectSlug: r.project?.slug ?? '',
      projectServerUrl: r.project?.serverUrl ?? null,
      branch: r.branch,
      branchSlug: r.branchSlug,
      pm2Name: r.pm2Name,
      runtimeName: r.pm2Name,
      runner: r.runner ?? 'pm2',
      port: r.port,
      status: r.status,
      runtimeOnline: runtime.online,
      runtimeStatus: runtime.status,
      pm2Online: runtime.online,
      active: runtime.online,
      pm2Status: runtime.status,
      monit: runtime.monit ?? null,
      previewUrl,
      lastDeployError: r.lastDeployError,
      activeExpiresAt,
      existenceExpiresAt,
      hasActiveLifetimeLimit,
      hasExistenceLifetimeLimit,
      envVars: normalizeEnvVars(r.envVars),
      projectEnvVars: normalizeEnvVars(r.project?.envVars),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async findAllForApi(
    maps: RuntimeMaps,
  ): Promise<InstanceListItem[]> {
    const rows = await this.repo.find({
      relations: ['project'],
      order: { updatedAt: 'DESC' },
    });
    return rows.map((r) => this.buildListItem(r, maps));
  }

  async findOneForApi(id: string, maps: RuntimeMaps): Promise<InstanceListItem> {
    const r = await this.repo.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!r) {
      throw new NotFoundException(`Instância "${id}" não encontrada`);
    }
    return this.buildListItem(r, maps);
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
    const maps = await this.fetchRuntimeMaps();
    const fresh = await this.repo.findOne({ where: { id }, relations: ['project'] });
    return this.buildListItem(fresh as PreviewInstance, maps);
  }

  async activateOrRedeployInstance(id: string): Promise<InstanceListItem> {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!row?.project) throw new NotFoundException();

    const enqueueAndReturn = async () => {
      row.lastDeployError = null;
      await this.repo.save(row);
      await this.setStatus(row, 'deploying');
      await this.enqueueRedeployJob(row.project.slug, row.branch, row.project.gitUrl);
      const maps = await this.fetchRuntimeMaps();
      const fresh = await this.repo.findOne({ where: { id }, relations: ['project'] });
      return this.buildListItem(fresh as PreviewInstance, maps);
    };

    if (row.status === 'active') {
      // Redeploy via fila BullMQ — não bloqueia o HTTP (build docker/pm2 pode demorar).
      return enqueueAndReturn();
    }

    if (
      row.status === 'waiting' ||
      row.status === 'paused' ||
      row.status === 'error'
    ) {
      const max = await this.settings.getMaxActiveInstances();
      const active = await this.countActiveSlots();
      if (active >= max) {
        await this.setStatus(row, 'waiting');
        const maps = await this.fetchRuntimeMaps();
        const fresh = await this.repo.findOne({
          where: { id },
          relations: ['project'],
        });
        return this.buildListItem(fresh as PreviewInstance, maps);
      }
      return enqueueAndReturn();
    }

    throw new BadRequestException(
      `Estado "${row.status}" não suporta ativação forçada agora`,
    );
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

  /**
   * Pausa instâncias ativas além do limite de tempo ativo do projeto e remove
   * instâncias além do limite de existência (destroy + checkout em disco).
   * Chamado pelo scheduler a cada minuto.
   */
  async enforceLifetimeLimits(): Promise<{ paused: number; destroyed: number }> {
    const rows = await this.repo.find({ relations: ['project'] });
    const now = Date.now();
    let paused = 0;
    let destroyed = 0;

    for (const row of rows) {
      if (!row.project) continue;
      const project = row.project;

      const existenceMs = lifetimeDurationMs(
        project.maxExistenceLifetimeDays,
        project.maxExistenceLifetimeHours,
      );
      if (existenceMs != null) {
        const age = now - row.createdAt.getTime();
        if (age >= existenceMs) {
          try {
            await this.destroyInstanceById(row.id);
            destroyed++;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.log.warn(
              `Lifetime destroy ${row.project.slug}/${row.branch}: ${msg}`,
            );
          }
          continue;
        }
      }

      if (row.status !== 'active') continue;

      const activeMs = lifetimeDurationMs(
        project.maxActiveLifetimeDays,
        project.maxActiveLifetimeHours,
      );
      if (activeMs == null) continue;

      const activeSince = (row.activatedAt ?? row.updatedAt).getTime();
      if (now - activeSince < activeMs) continue;

      try {
        await this.pauseInstance(row.id);
        paused++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.log.warn(
          `Lifetime pause ${row.project.slug}/${row.branch}: ${msg}`,
        );
      }
    }

    return { paused, destroyed };
  }
}
