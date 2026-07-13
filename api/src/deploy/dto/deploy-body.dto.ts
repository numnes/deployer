import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class DeployBodyDto {
  @ApiProperty({ example: 'project-slug' })
  @IsString()
  @MinLength(1)
  project: string;

  @ApiProperty({ example: 'your-branch' })
  @IsString()
  @MinLength(1)
  branch: string;

  @ApiPropertyOptional({
    example: 'ghcr.io/org/app:preview-feature-abc123',
    description:
      'Imagem pré-buildada (obrigatória para runner docker com build remote)',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  image?: string;
}
