import { Controller, Get, Param, Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/dashboard')
export class DashboardController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Retorna resumo financeiro inicial do workspace' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiNotFoundResponse({ description: 'Workspace nao encontrado ou inacessivel' })
  @ApiOkResponse({
    schema: {
      example: {
        workspaceId: 'workspace-id',
        totalIncluded: '5000.00',
        totalOverall: '8000.00',
        accounts: [
          {
            id: 'account-id',
            name: 'Conta Principal',
            type: 'CHECKING',
            includeInTotal: true,
            balance: '5000.00',
          },
        ],
      },
    },
  })
  summary(@Request() request: AuthenticatedRequest, @Param('workspaceId') workspaceId: string) {
    return this.accountsService.getDashboardSummary(request.user.sub, workspaceId);
  }
}
