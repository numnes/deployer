import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiKeysService } from './api-keys.service';

@ApiTags('api-keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @ApiBearerAuth('jwt')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { label: { type: 'string', nullable: true } },
    },
  })
  @ApiOkResponse({
    description: 'Retorna a chave em texto plano (uma única vez)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  async create(
    @Req() req: { user: { userId: string } },
    @Body() body: { label?: string },
  ) {
    const { plainKey } = await this.apiKeys.create(req.user.userId, body?.label);
    return {
      apiKey: plainKey,
      message: 'Guarde esta chave; ela não será exibida novamente.',
    };
  }

  @ApiBearerAuth('jwt')
  @ApiOkResponse({ description: 'Lista as chaves do usuário' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  list(@Req() req: { user: { userId: string } }) {
    return this.apiKeys.listForUser(req.user.userId);
  }
}
