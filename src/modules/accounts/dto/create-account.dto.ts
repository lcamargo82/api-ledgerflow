import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ example: 'Conta Principal' })
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiPropertyOptional({ example: 'Conta usada para despesas do mes' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;

  @ApiProperty({ enum: AccountType, example: AccountType.CHECKING })
  @IsEnum(AccountType)
  type!: AccountType;

  @ApiPropertyOptional({ example: 'nubank' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  institutionId?: string;

  @ApiProperty({ example: '#7C3AED' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color!: string;

  @ApiProperty({ example: 'bank' })
  @IsString()
  @Length(2, 40)
  icon!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  includeInTotal?: boolean;

  @ApiPropertyOptional({ example: 5000, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  initialBalance?: number;
}
