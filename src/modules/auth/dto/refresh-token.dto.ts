import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh-token-from-login' })
  @IsString()
  @MinLength(32)
  refreshToken!: string;
}
