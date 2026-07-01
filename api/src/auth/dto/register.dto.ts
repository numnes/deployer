import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'teste@teste.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha' })
  @IsString()
  @MinLength(8)
  password: string;
}
