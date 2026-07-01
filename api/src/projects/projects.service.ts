import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { PreviewInstancesService } from '../preview-instances/preview-instances.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
    @Inject(forwardRef(() => PreviewInstancesService))
    private readonly previewInstances: PreviewInstancesService,
  ) {}

  create(dto: CreateProjectDto) {
    const p = this.repo.create({
      slug: dto.slug,
      gitUrl: dto.gitUrl,
      serverUrl: dto.serverUrl?.trim() || null,
    });
    return this.repo.save(p);
  }

  findAll() {
    return this.repo.find({ order: { slug: 'ASC' } });
  }

  async getBySlug(slug: string): Promise<Project> {
    const p = await this.repo.findOne({ where: { slug } });
    if (!p) {
      throw new NotFoundException(`Projeto "${slug}" não encontrado`);
    }
    return p;
  }

  async findOne(id: string): Promise<Project> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) {
      throw new NotFoundException(`Projeto não encontrado`);
    }
    return p;
  }

  async updateServerUrl(id: string, serverUrl: string | null | undefined) {
    const p = await this.findOne(id);
    if (serverUrl === undefined) {
      return p;
    }
    const trimmed = serverUrl?.trim();
    p.serverUrl = trimmed ? trimmed : null;
    return this.repo.save(p);
  }

  async deleteProject(id: string) {
    await this.findOne(id);
    const instances = await this.previewInstances.destroyAllForProject(id);
    await this.repo.delete(id);
    return { ok: true as const, instances };
  }

  async teardownAllInstances(id: string) {
    await this.findOne(id);
    return this.previewInstances.pauseAllActiveForProject(id);
  }

  async restartAllInstances(id: string) {
    await this.findOne(id);
    return this.previewInstances.restartAllForProject(id);
  }
}
