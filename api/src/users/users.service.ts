import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import type { UserRole } from '../auth/user-role';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async onModuleInit() {
    const adminCount = await this.repo.count({ where: { role: 'admin' } });
    if (adminCount > 0) return;
    const first = await this.repo.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    if (!first[0]) return;
    first[0].role = 'admin';
    await this.repo.save(first[0]);
  }

  toPublic(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async list() {
    const rows = await this.repo.find({
      select: ['id', 'email', 'role', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
    return rows;
  }

  async findById(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Usuário não encontrado');
    return row;
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.repo.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email já cadastrado');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.repo.create({
      email,
      passwordHash,
      role: dto.role ?? 'operator',
    });
    const saved = await this.repo.save(user);
    return this.toPublic(saved);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.findById(id);
    if (dto.role && dto.role !== user.role) {
      if (user.id === actorId && dto.role !== 'admin') {
        throw new ForbiddenException('Você não pode remover seu próprio acesso de admin');
      }
      if (user.role === 'admin' && dto.role === 'operator') {
        await this.assertNotLastAdmin(user.id);
      }
      user.role = dto.role;
    }
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 12);
    }
    const saved = await this.repo.save(user);
    return this.toPublic(saved);
  }

  async remove(id: string, actorId: string) {
    if (id === actorId) {
      throw new ForbiddenException('Você não pode remover sua própria conta');
    }
    const user = await this.findById(id);
    if (user.role === 'admin') {
      await this.assertNotLastAdmin(user.id);
    }
    await this.repo.delete({ id });
    return { ok: true as const };
  }

  private async assertNotLastAdmin(userId: string) {
    const admins = await this.repo.count({ where: { role: 'admin' } });
    if (admins <= 1) {
      const last = await this.repo.findOne({
        where: { role: 'admin' },
      });
      if (last?.id === userId) {
        throw new ForbiddenException('Não é possível remover o último administrador');
      }
    }
  }
}
