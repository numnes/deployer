import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MAX_ACTIVE_INSTANCES_KEY, SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Configurações da ferramenta' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async getAll() {
    const raw = await this.settings.getAll();
    const maxActiveInstances = await this.settings.getMaxActiveInstances();
    const nodeLabel = await this.settings.getNodeLabel();
    return {
      ...raw,
      [MAX_ACTIVE_INSTANCES_KEY]: String(maxActiveInstances),
      maxActiveInstancesParsed: maxActiveInstances,
      nodeLabel,
    };
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Atualiza configurações' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch()
  async patch(@Body() body: { maxActiveInstances?: number; nodeLabel?: string }) {
    if (body.maxActiveInstances != null) {
      await this.settings.setMaxActiveInstances(body.maxActiveInstances);
    }
    if (body.nodeLabel !== undefined) {
      await this.settings.setNodeLabel(body.nodeLabel);
    }
    return this.getAll();
  }
}
