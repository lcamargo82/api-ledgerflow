import { ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';
import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

const USER_CATEGORY_TYPES = [CategoryType.INCOME, CategoryType.EXPENSE] as const;

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Mercado e Alimentacao' })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @ApiPropertyOptional({ enum: USER_CATEGORY_TYPES, example: CategoryType.EXPENSE })
  @IsOptional()
  @IsIn(USER_CATEGORY_TYPES)
  type?: CategoryType;

  @ApiPropertyOptional({ example: '#F97316' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @ApiPropertyOptional({ example: 'shopping-basket' })
  @IsOptional()
  @IsString()
  @Length(2, 40)
  icon?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
