import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MonthlyPeriodQueryDto } from '../../common/dto/monthly-period-query.dto';
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
  @ApiQuery({ name: 'month', required: false, example: 7, description: 'Mes de referencia' })
  @ApiQuery({ name: 'year', required: false, example: 2026, description: 'Ano de referencia' })
  @ApiNotFoundResponse({ description: 'Workspace nao encontrado ou inacessivel' })
  @ApiOkResponse({
    schema: {
      example: {
        workspaceId: 'workspace-id',
        currentBalance: '5000.00',
        totalIncluded: '5000.00',
        totalOverall: '8000.00',
        expensesByCategory: [
          {
            categoryId: 'category-id',
            name: 'Alimentacao',
            color: '#EF4444',
            totalAmount: '250.75',
          },
        ],
        budgetStatus: {
          hasBudget: false,
          message: 'Voce ainda nao tem um planejamento definido para esse mes.',
        },
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
  summary(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Query() query: MonthlyPeriodQueryDto,
  ) {
    return this.accountsService.getDashboardSummary(
      request.user.sub,
      workspaceId,
      query.month,
      query.year,
    );
  }
}
