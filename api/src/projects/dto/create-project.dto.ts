import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'project-name' })
  @IsString()
  @MinLength(1)
  @Matches(/^[a-z0-9][a-z0-9-]*$/, {
    message: 'slug deve ser minúsculo (letras, números, hífen)',
  })
  slug: string;

  @ApiProperty({ example: 'https://github.com/yout-account/your-repo.git' })
  @IsString()
  @MinLength(1)
  gitUrl: string;

  @ApiPropertyOptional({ example: 'https://meuteste.com' })
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @IsUrl({ require_protocol: true, require_tld: false })
  serverUrl?: string | null;
}
