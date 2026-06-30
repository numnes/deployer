import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SetupService } from './setup.service';

@ApiTags('setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Verifica configuração do nginx no host' })
  @UseGuards(JwtAuthGuard)
  @Get('nginx-check')
  checkNginx() {
    return this.setup.checkNginx();
  }
}
