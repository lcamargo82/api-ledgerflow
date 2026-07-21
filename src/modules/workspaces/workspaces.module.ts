import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { WorkspaceInvitationsController, WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [ConfigModule, PrismaModule, EmailModule],
  controllers: [WorkspacesController, WorkspaceInvitationsController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
