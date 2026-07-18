import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'dev@api-ledgerflow.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'change-me', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
