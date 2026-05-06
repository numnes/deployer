import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeployBodyDto {
  @ApiProperty({ example: 'project-slug' })
  @IsString()
  @MinLength(1)
  project: string;

  @ApiProperty({ example: 'your-branch' })
  @IsString()
  @MinLength(1)
  branch: string;
}
