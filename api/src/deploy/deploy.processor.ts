import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { execFile } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { PreviewInstancesService } from '../preview-instances/preview-instances.service';
import { runCoreDeployScript } from './deploy-exec.helper';

const execFileAsync = promisify(execFile);

export type DeployJobPayload = {
  projectSlug: string;
  branch: string;
  gitUrl?: string;
};

@Processor('deploy')
export class DeployProcessor extends WorkerHost {
  private readonly logger = new Logger(DeployProcessor.name);

  constructor(
    private readonly config: ConfigService,
    private readonly previewInstances: PreviewInstancesService,
  ) {
    super();
  }

  async process(job: Job<DeployJobPayload>) {
    try {
      switch (job.name) {
        case 'create':
          return await this.createAction(job);
        case 'destroy':
          return await this.destroyAction(job);
        default:
          this.logger.warn(`Job desconhecido: ${job.name} (id=${job.id})`);
          return { ok: false, reason: 'unknown_job', name: job.name };
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Erro ao processar job ${job.id}: ${message}`);
      throw e;
    }
  }

  async createAction(job: Job<DeployJobPayload>) {
    const queued = await this.previewInstances.classifyDeployOrQueue(
      job.data.projectSlug,
      job.data.branch,
    );
    if (queued === 'queued') {
      return { ok: true, action: 'queued' };
    }

    await this.previewInstances.markDeploying(
      job.data.projectSlug,
      job.data.branch,
    );
    try {
      const meta = await runCoreDeployScript(
        this.config,
        job.data.projectSlug,
        job.data.gitUrl as string,
        job.data.branch,
      );
      await this.previewInstances.finalizeDeploySuccess(meta);
    } catch (e) {
      await this.previewInstances.finalizeDeployError(
        job.data.projectSlug,
        job.data.branch,
      );
      throw e;
    }
    await this.previewInstances.processWaitingQueue();
    return { ok: true, action: 'deploy' };
  }

  async destroyAction(job: Job<DeployJobPayload>) {
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
    await execFileAsync(script, [job.data.projectSlug, job.data.branch], {
      env,
    });
    await this.previewInstances.removeByProjectSlugAndBranch(
      job.data.projectSlug,
      job.data.branch,
    );
    return { ok: true, action: 'destroy' };
  }
}
