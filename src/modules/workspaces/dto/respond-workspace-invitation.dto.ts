import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RespondWorkspaceInvitationDto {
  @ApiProperty({ example: 'invitation-token' })
  @IsString()
  @Length(32, 160)
  token!: string;
}
