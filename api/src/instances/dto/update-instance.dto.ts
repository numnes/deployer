import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class UpdateInstanceDto {
  @ApiPropertyOptional({
    example: { FEATURE_FLAG: '1' },
    description:
      'Override de env desta instância (KEY → string). Merge sobre as envs do projeto no próximo deploy. Use {} para limpar overrides.',
  })
  @IsOptional()
  @IsObject()
  envVars?: Record<string, string>;
}
