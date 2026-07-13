import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { ClusterKeyScope } from '../entities/cluster-key.entity';
import { ClusterKeysService } from './cluster-keys.service';

class CreateClusterKeyDto {
  label?: string;
  scope?: ClusterKeyScope;
}

@ApiTags('cluster-keys')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('cluster-keys')
export class ClusterKeysController {
  constructor(private readonly keys: ClusterKeysService) {}

  @ApiOkResponse({ description: 'Lista de chaves cluster (sem o segredo)' })
  @Get()
  list() {
    return this.keys.list();
  }

  @ApiBody({
    schema: {
      properties: {
        label: { type: 'string' },
        scope: { type: 'string', enum: ['read', 'write'] },
      },
    },
  })
  @ApiOkResponse({ description: 'Chave cluster criada (exibida uma vez)' })
  @Post()
  create(@Body() dto: CreateClusterKeyDto) {
    return this.keys.create(dto.label, dto.scope);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.keys.remove(id);
  }
}
