import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const INSTITUTION_TYPES = [
  'BANK',
  'DIGITAL_BANK',
  'BENEFITS',
  'BROKER',
  'PAYMENT_INSTITUTION',
  'OTHER',
] as const;

export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

export class ListInstitutionsDto {
  @ApiPropertyOptional({ enum: INSTITUTION_TYPES })
  @IsOptional()
  @IsIn(INSTITUTION_TYPES)
  type?: InstitutionType;

  @ApiPropertyOptional({ example: 'nubank' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBooleanString()
  includeInactive?: string;
}
