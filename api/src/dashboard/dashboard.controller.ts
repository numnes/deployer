import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClusterAggregatorService } from '../cluster/cluster-aggregator.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly cluster: ClusterAggregatorService) {}

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Resumo agregado para o dashboard' })
  @UseGuards(JwtAuthGuard)
  @Get('summary')
  summary() {
    return this.cluster.aggregateDashboard();
  }
}
