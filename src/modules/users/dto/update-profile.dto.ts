import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Leandro Silva', minLength: 3 })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional({ example: 'leandro@example.com' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'OldPass123' })
  @ValidateIf((dto: UpdateProfileDto) => Boolean(dto.password))
  @IsString()
  @MinLength(8)
  oldPassword?: string;

  @ApiPropertyOptional({
    example: 'NewPass123',
    minLength: 8,
    description: 'Deve conter letra maiuscula, minuscula e numero.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(passwordPattern, {
    message: 'password must contain uppercase, lowercase and number',
  })
  password?: string;
}
