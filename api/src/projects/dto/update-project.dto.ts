import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

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

  @ApiPropertyOptional({
    example: 7,
    description:
      'Dias máximos em que instâncias podem ficar ativas (status active). null = sem limite.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  maxActiveLifetimeDays?: number | null;

  @ApiPropertyOptional({
    example: 12,
    description:
      'Horas adicionais ao limite de tempo ativo (combinado com dias). null = sem limite.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(87600)
  maxActiveLifetimeHours?: number | null;

  @ApiPropertyOptional({
    example: 30,
    description:
      'Dias máximos de existência da instância (desde criação). Após expirar, remove checkout e registro. null = sem limite.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  maxExistenceLifetimeDays?: number | null;

  @ApiPropertyOptional({
    example: 0,
    description:
      'Horas adicionais ao limite de existência (combinado com dias). null = sem limite.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(87600)
  maxExistenceLifetimeHours?: number | null;
}
