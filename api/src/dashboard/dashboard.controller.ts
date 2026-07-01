import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Resumo para o dashboard' })
  @UseGuards(JwtAuthGuard)
  @Get('summary')
  summary() {
    return this.dashboard.summary();
  }
}
