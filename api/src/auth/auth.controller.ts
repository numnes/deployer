import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SetupKeyGuard } from './guards/setup-key.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Token JWT' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiSecurity('setup-key')
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ description: 'Usuário criado ou senha atualizada + token' })
  @UseGuards(SetupKeyGuard)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
}
