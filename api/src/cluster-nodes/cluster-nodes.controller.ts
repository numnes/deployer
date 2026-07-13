import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClusterAggregatorService } from '../cluster/cluster-aggregator.service';
import {
  ClusterNodesService,
  type CreateClusterNodeDto,
} from './cluster-nodes.service';

@ApiTags('cluster-nodes')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('cluster-nodes')
export class ClusterNodesController {
  constructor(
    private readonly nodes: ClusterNodesService,
    private readonly aggregator: ClusterAggregatorService,
  ) {}

  @Get()
  list() {
    return this.nodes.listForApi();
  }

  @ApiBody({
    schema: {
      properties: {
        label: { type: 'string' },
        baseUrl: { type: 'string' },
        apiKey: { type: 'string' },
      },
    },
  })
  @Post()
  async create(@Body() dto: CreateClusterNodeDto) {
    const node = await this.nodes.create(dto);
    const test = await this.aggregator.testRemoteNode(node);
    if (test.ok) {
      await this.nodes.setScope(node.id, test.scope);
      node.scope = test.scope;
    }
    return node;
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.nodes.remove(id);
  }

  @ApiOkResponse({ description: 'Testa conexão com o nó remoto' })
  @Post(':id/test')
  async test(@Param('id', ParseUUIDPipe) id: string) {
    const node = await this.nodes.findById(id);
    const result = await this.aggregator.testRemoteNode(node);
    if (result.ok) {
      await this.nodes.setScope(node.id, result.scope);
    }
    return result;
  }
}
