import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ProjectsService } from '../projects/projects.service';
import { DeployJobPayload } from './deploy.processor';

@Injectable()
export class DeployService {
  constructor(
    @InjectQueue('deploy')
    private readonly deployQueue: Queue<DeployJobPayload>,
    private readonly projects: ProjectsService,
  ) {}

  async enqueueDeploy(projectSlug: string, branch: string) {
    console.log('TESTE');
    const p = await this.projects.getBySlug(projectSlug);
    const job = await this.deployQueue.add('create', {
      projectSlug,
      branch,
      gitUrl: p.gitUrl,
    });
    return { status: 'completed', jobId: String(job.id) };
  }

  async enqueueDestroy(projectSlug: string, branch: string) {
    const job = await this.deployQueue.add('destroy', {
      projectSlug,
      branch,
    });
    return { status: 'completed', jobId: String(job.id) };
  }
}
