import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClusterKey, type ClusterKeyScope } from '../entities/cluster-key.entity';

@Injectable()
export class ClusterKeysService {
  constructor(
    @InjectRepository(ClusterKey)
    private readonly repo: Repository<ClusterKey>,
  ) {}

  static hashKey(plain: string): string {
    return createHash('sha256').update(plain, 'utf8').digest('hex');
  }

  /** Retorna a chave (com escopo) se válida, senão null. */
  async resolveKey(plain: string): Promise<ClusterKey | null> {
    if (!plain) return null;
    const keyHash = ClusterKeysService.hashKey(plain);
    return this.repo.findOne({ where: { keyHash } });
  }

  async validateKey(plain: string): Promise<boolean> {
    return !!(await this.resolveKey(plain));
  }

  async create(
    label?: string,
    scope: ClusterKeyScope = 'read',
  ): Promise<{ plainKey: string; scope: ClusterKeyScope }> {
    const normalizedScope: ClusterKeyScope = scope === 'write' ? 'write' : 'read';
    const plainKey =
      'clu_' + randomBytes(32).toString('base64url').replace(/=/g, '');
    const keyHash = ClusterKeysService.hashKey(plainKey);
    await this.repo.save(
      this.repo.create({
        keyHash,
        label: label?.trim() || 'cluster',
        scope: normalizedScope,
      }),
    );
    return { plainKey, scope: normalizedScope };
  }

  async list() {
    return this.repo.find({
      select: ['id', 'label', 'scope', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
