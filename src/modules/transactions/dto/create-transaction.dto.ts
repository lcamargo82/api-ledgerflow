import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
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

  @ApiProperty({ example: 'category-id' })
  @IsUUID()
  categoryId!: string;

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

