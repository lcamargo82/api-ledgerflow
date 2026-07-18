import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class SignUpDto {
  @ApiProperty({ example: 'Leandro Silva', minLength: 3 })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ example: 'leandro@example.com' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'StrongPass123',
    minLength: 8,
    description: 'Deve conter letra maiuscula, minuscula e numero.',
  })
  @IsString()
  @MinLength(8)
  @Matches(passwordPattern, {
    message: 'password must contain uppercase, lowercase and number',
  })
  password!: string;

  @ApiProperty({ example: 'StrongPass123' })
  @IsString()
  passwordConfirmation!: string;
}
