import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list() {
    const rows = await this.users.find({
      select: ['id', 'email', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
    return rows;
  }
}

