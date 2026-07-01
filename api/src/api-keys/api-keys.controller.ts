import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';

@ApiTags('api-keys')
@Controller('api-keys')
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Req() req: { user: { userId: string } }) {
    return this.apiKeys.listForUser(req.user.userId);
  }
}
