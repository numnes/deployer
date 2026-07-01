import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { DeployApiKeyGuard } from './guards/deploy-api-key.guard';
import { DeployBodyDto } from './dto/deploy-body.dto';
import { DeployService } from './deploy.service';

@ApiTags('deploy')
@Controller()
export class DeployController {
  constructor(private readonly deployService: DeployService) {}

  @ApiSecurity('deploy-api-key')
  @ApiBody({ type: DeployBodyDto })
  @ApiOkResponse({ description: 'Enfileira um deploy' })
  @UseGuards(DeployApiKeyGuard)
  @Post('deploy')
  async createDeploy(@Body() data: DeployBodyDto) {
    return this.deployService.enqueueDeploy(data);
  }

  @ApiSecurity('deploy-api-key')
  @ApiBody({ type: DeployBodyDto })
  @ApiOkResponse({ description: 'Enfileira a destruição do deploy' })
  @UseGuards(DeployApiKeyGuard)
  @Post('deploy/destroy')
  async destroy(@Body() body: DeployBodyDto) {
    return this.deployService.enqueueDestroy(body.project, body.branch);
  }
}
