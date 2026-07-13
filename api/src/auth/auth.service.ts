import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    const passwordHash = await bcrypt.hash(dto.password, 12);
    if (existing) {
      existing.passwordHash = passwordHash;
      await this.users.save(existing);
      return this.issueTokens(existing);
    }
    const user = this.users.create({ email: dto.email, passwordHash });
    await this.users.save(user);
    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.issueTokens(user);
  }

  private issueTokens(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwt.sign(payload),
    };
  }
}
