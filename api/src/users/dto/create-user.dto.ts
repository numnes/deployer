import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { USER_ROLES, type UserRole } from '../../auth/user-role';

export class CreateUserDto {
  @ApiProperty({ example: 'operator@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: USER_ROLES, default: 'operator' })
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;
}
