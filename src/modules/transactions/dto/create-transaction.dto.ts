import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ example: 'account-id' })
  @IsUUID()
  accountId!: string;

  @ApiPropertyOptional({
    example: 'destination-account-id',
    description: 'Obrigatorio quando type = TRANSFER',
  })
  @IsOptional()
  @IsUUID()
  destinationAccountId?: string;

  @ApiPropertyOptional({
    example: 'category-id',
    description: 'Obrigatorio para INCOME e EXPENSE; nao usado em TRANSFER',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty({ example: 150.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: '2026-07-19T12:00:00.000Z' })
  @IsDateString()
  occurredAt!: string;

  @ApiProperty({ example: 'Jantar' })
  @IsString()
  @Length(2, 160)
  @MaxLength(160)
  description!: string;
}
