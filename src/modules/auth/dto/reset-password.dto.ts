import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-from-email' })
  @IsString()
  @MinLength(32)
  token!: string;

  @ApiProperty({
    example: 'NewStrongPass123',
    minLength: 8,
    description: 'Deve conter letra maiuscula, minuscula e numero.',
  })
  @IsString()
  @MinLength(8)
  @Matches(passwordPattern, {
    message: 'password must contain uppercase, lowercase and number',
  })
  password!: string;

  @ApiProperty({ example: 'NewStrongPass123' })
  @IsString()
  passwordConfirmation!: string;
}
