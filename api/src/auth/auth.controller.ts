import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SetupKeyGuard } from './guards/setup-key.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Token JWT e perfil do usuário' })
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

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Perfil do usuário autenticado' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { userId: string } }) {
    return this.auth.me(req.user.userId);
  }
}
