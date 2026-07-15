import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateInstanceDto } from './dto/update-instance.dto';
import { InstancesService } from './instances.service';

@ApiTags('instances')
@Controller('instances')
export class InstancesController {
  constructor(private readonly instances: InstancesService) {}

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Lista de instâncias (local + nós cluster)' })
  @UseGuards(JwtAuthGuard)
  @Get()
  list() {
    return this.instances.listForApi();
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Logs recentes do processo PM2 (nostream)' })
  @UseGuards(JwtAuthGuard)
  @Get(':id/logs')
  logs(
    @Param('id') id: string,
    @Query('lines', new DefaultValuePipe(200), ParseIntPipe) lines: number,
  ) {
    return this.instances.logsForInstance(id, lines);
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Atualiza override de env da instância' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: UpdateInstanceDto) {
    return this.instances.update(id, dto);
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Pausa instância (derruba PM2/nginx, mantém registro)' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/pause')
  pause(@Param('id') id: string) {
    return this.instances.pause(id);
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Ativa, despausa ou redeploy da instância' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.instances.activate(id);
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Remove instância (destroy + remove do banco)' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/remove')
  remove(@Param('id') id: string) {
    return this.instances.remove(id);
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Detalhe de uma instância' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.instances.getOneForApi(id);
  }
}
