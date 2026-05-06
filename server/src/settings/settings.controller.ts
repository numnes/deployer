import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MAX_ACTIVE_INSTANCES_KEY, SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Configurações da ferramenta' })
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll() {
    const raw = await this.settings.getAll();
    const maxActiveInstances = await this.settings.getMaxActiveInstances();
    return {
      ...raw,
      [MAX_ACTIVE_INSTANCES_KEY]: String(maxActiveInstances),
      maxActiveInstancesParsed: maxActiveInstances,
    };
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Atualiza configurações' })
  @UseGuards(JwtAuthGuard)
  @Patch()
  async patch(@Body() body: { maxActiveInstances?: number }) {
    if (body.maxActiveInstances != null) {
      await this.settings.setMaxActiveInstances(body.maxActiveInstances);
    }
    return this.getAll();
  }
}
