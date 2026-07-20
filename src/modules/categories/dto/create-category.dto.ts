import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';
import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

const USER_CATEGORY_TYPES = [CategoryType.INCOME, CategoryType.EXPENSE] as const;

export class CreateCategoryDto {
  @ApiProperty({ example: 'Alimentacao' })
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiProperty({ enum: USER_CATEGORY_TYPES, example: CategoryType.EXPENSE })
  @IsIn(USER_CATEGORY_TYPES)
  type!: CategoryType;

  @ApiPropertyOptional({ example: '#EF4444', default: '#64748B' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @ApiPropertyOptional({ example: 'utensils', default: 'tag' })
  @IsOptional()
  @IsString()
  @Length(2, 40)
  icon?: string;
}
