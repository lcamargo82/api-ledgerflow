import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';
import { IsEmail, IsEnum } from 'class-validator';

export class CreateWorkspaceInvitationDto {
  @ApiProperty({ example: 'pessoa@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: WorkspaceRole, example: WorkspaceRole.EDITOR })
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}
