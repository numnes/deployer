import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
  ) {}

  static hashKey(plain: string): string {
    return createHash('sha256').update(plain, 'utf8').digest('hex');
  }

  async validateDeployKey(plain: string): Promise<boolean> {
    const keyHash = ApiKeysService.hashKey(plain);
    const row = await this.repo.findOne({ where: { keyHash } });
    return !!row;
  }

  async create(userId: string, label?: string): Promise<{ plainKey: string }> {
    const plainKey =
      'dep_' + randomBytes(32).toString('base64url').replace(/=/g, '');
    const keyHash = ApiKeysService.hashKey(plainKey);
    await this.repo.save(
      this.repo.create({
        userId,
        keyHash,
        label: label ?? 'github-actions',
      }),
    );
    return { plainKey };
  }

  async listForUser(userId: string) {
    return this.repo.find({
      where: { userId },
      select: ['id', 'label', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }
}
