import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional({
    example: 'https://meuteste.com',
    description:
      'URL pública base do preview (nginx). Ex.: https://meuteste.com — o path da branch é /<branch-slug>/',
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @IsUrl({ require_protocol: true, require_tld: false })
  serverUrl?: string | null;
}
