import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClusterAggregatorService } from '../cluster/cluster-aggregator.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly cluster: ClusterAggregatorService,
  ) {}

  @ApiBearerAuth('jwt')
  @ApiBody({ type: CreateProjectDto })
  @ApiOkResponse({ description: 'Projeto criado' })
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projects.create(dto);
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Lista de projetos (local + nós cluster)' })
  @UseGuards(JwtAuthGuard)
  @Get()
  list() {
    return this.cluster.aggregateProjects();
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Projeto por id' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projects.findOne(id);
  }

  @ApiBearerAuth('jwt')
  @ApiBody({ type: UpdateProjectDto })
  @ApiOkResponse({ description: 'Projeto atualizado' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(id, dto);
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Pausa todas as instâncias ativas do projeto' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/instances/teardown')
  teardownInstances(@Param('id', ParseUUIDPipe) id: string) {
    return this.projects.teardownAllInstances(id);
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Reinicia / redeploy de todas as instâncias do projeto' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/instances/restart')
  restartInstances(@Param('id', ParseUUIDPipe) id: string) {
    return this.projects.restartAllInstances(id);
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Remove projeto e todas as instâncias' })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.projects.deleteProject(id);
  }
}
