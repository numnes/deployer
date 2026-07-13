import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClusterNode } from '../entities/cluster-node.entity';
import { ClusterNodeSecretService } from './cluster-node-secret.service';

export type CreateClusterNodeDto = {
  label: string;
  baseUrl: string;
  apiKey: string;
};

@Injectable()
export class ClusterNodesService {
  constructor(
    @InjectRepository(ClusterNode)
    private readonly repo: Repository<ClusterNode>,
    private readonly secrets: ClusterNodeSecretService,
  ) {}

  normalizeBaseUrl(url: string): string {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new BadRequestException('baseUrl deve começar com http:// ou https://');
    }
    return trimmed;
  }

  listForApi() {
    return this.repo.find({
      select: ['id', 'label', 'baseUrl', 'scope', 'enabled', 'createdAt', 'updatedAt'],
      order: { label: 'ASC' },
    });
  }

  async findEnabled(): Promise<ClusterNode[]> {
    return this.repo.find({
      where: { enabled: true },
      order: { label: 'ASC' },
    });
  }

  async findById(id: string): Promise<ClusterNode> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Nó cluster não encontrado');
    return row;
  }

  async create(dto: CreateClusterNodeDto) {
    const label = dto.label?.trim();
    const apiKey = dto.apiKey?.trim();
    if (!label) throw new BadRequestException('label é obrigatório');
    if (!apiKey?.startsWith('clu_')) {
      throw new BadRequestException('apiKey deve ser uma chave cluster (clu_…)');
    }
    const row = this.repo.create({
      label,
      baseUrl: this.normalizeBaseUrl(dto.baseUrl),
      apiKey: this.secrets.encrypt(apiKey),
      enabled: true,
    });
    return this.repo.save(row);
  }

  async getPlainApiKey(node: ClusterNode): Promise<string> {
    const plain = this.secrets.decrypt(node.apiKey);
    if (!this.secrets.isEncrypted(node.apiKey)) {
      node.apiKey = this.secrets.encrypt(plain);
      await this.repo.save(node);
    }
    return plain;
  }

  async remove(id: string) {
    await this.findById(id);
    await this.repo.delete({ id });
    return { ok: true as const };
  }

  async setEnabled(id: string, enabled: boolean) {
    const row = await this.findById(id);
    row.enabled = enabled;
    return this.repo.save(row);
  }

  async setScope(id: string, scope: 'read' | 'write') {
    const row = await this.findById(id);
    row.scope = scope === 'write' ? 'write' : 'read';
    return this.repo.save(row);
  }
}
