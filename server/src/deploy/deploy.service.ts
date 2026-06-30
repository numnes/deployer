import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ProjectsService } from '../projects/projects.service';
import { DeployJobPayload } from './deploy.processor';
import { DeployBodyDto } from './dto/deploy-body.dto';

@Injectable()
export class DeployService {
  constructor(
    @InjectQueue('deploy')
    private readonly deployQueue: Queue<DeployJobPayload>,
    private readonly projects: ProjectsService,
  ) {}

  async enqueueDeploy(data: DeployBodyDto) {
    const { project, branch } = data;
    const projectDocument = await this.projects.getBySlug(project);
    const job = await this.deployQueue.add('create', {
      projectSlug: project,
      branch,
      gitUrl: projectDocument.gitUrl,
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
