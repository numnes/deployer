import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtOrSetupKeyGuard } from '../auth/guards/jwt-or-setup-key.guard';
import { User } from '../entities/user.entity';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  @ApiBearerAuth('jwt')
  @ApiSecurity('setup-key')
  @UseGuards(JwtOrSetupKeyGuard)
  @Get()
  async list() {
    const rows = await this.users.find({
      select: ['id', 'email', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
    return rows;
  }
}

