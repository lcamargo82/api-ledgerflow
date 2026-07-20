import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [PrismaModule, WorkspacesModule, InstitutionsModule],
  controllers: [AccountsController, DashboardController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
