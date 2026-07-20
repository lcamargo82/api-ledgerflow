import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista movimentacoes do workspace com filtros e paginacao' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiQuery({ name: 'accountId', required: false, example: 'account-id' })
  @ApiQuery({ name: 'categoryId', required: false, example: 'category-id' })
  @ApiQuery({ name: 'type', required: false, enum: ['INCOME', 'EXPENSE'] })
  @ApiQuery({ name: 'origin', required: false, enum: ['MANUAL', 'INITIAL_BALANCE'] })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-07-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-07-31' })
  @ApiQuery({ name: 'search', required: false, example: 'mercado' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'perPage', required: false, example: 20 })
  @ApiNotFoundResponse({ description: 'Workspace nao encontrado ou inacessivel' })
  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            id: 'transaction-id',
            workspaceId: 'workspace-id',
            accountId: 'account-id',
            categoryId: 'category-id',
            type: 'EXPENSE',
            origin: 'MANUAL',
            amount: '150.50',
            occurredAt: '2026-07-19T12:00:00.000Z',
            description: 'Jantar',
          },
        ],
        meta: {
          page: 1,
          perPage: 20,
          total: 1,
          totalPages: 1,
        },
      },
    },
  })
  list(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Query() filters: ListTransactionsDto,
  ) {
    return this.transactionsService.list(request.user.sub, workspaceId, filters);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma receita ou despesa manual' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiBadRequestResponse({ description: 'Payload invalido, conta ou categoria incompativel' })
  @ApiNotFoundResponse({ description: 'Workspace nao encontrado ou sem permissao de escrita' })
  @ApiCreatedResponse({
    schema: {
      example: {
        id: 'transaction-id',
        workspaceId: 'workspace-id',
        accountId: 'account-id',
        categoryId: 'category-id',
        type: 'EXPENSE',
        origin: 'MANUAL',
        amount: '150.50',
        occurredAt: '2026-07-19T12:00:00.000Z',
        description: 'Jantar',
      },
    },
  })
  create(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(request.user.sub, workspaceId, dto);
  }

  @Get(':transactionId')
  @ApiOperation({ summary: 'Detalha uma movimentacao do workspace' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiParam({ name: 'transactionId', example: 'transaction-id' })
  @ApiNotFoundResponse({ description: 'Workspace ou transacao nao encontrados' })
  findOne(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.transactionsService.findOne(request.user.sub, workspaceId, transactionId);
  }

  @Patch(':transactionId')
  @ApiOperation({ summary: 'Atualiza uma movimentacao manual' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiParam({ name: 'transactionId', example: 'transaction-id' })
  @ApiBadRequestResponse({ description: 'Payload invalido ou transacao sistemica protegida' })
  @ApiNotFoundResponse({ description: 'Workspace ou transacao nao encontrados' })
  update(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('transactionId') transactionId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(request.user.sub, workspaceId, transactionId, dto);
  }

  @Delete(':transactionId')
  @ApiOperation({ summary: 'Remove uma movimentacao manual' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiParam({ name: 'transactionId', example: 'transaction-id' })
  @ApiBadRequestResponse({ description: 'Transacao sistemica protegida' })
  @ApiNotFoundResponse({ description: 'Workspace ou transacao nao encontrados' })
  @ApiOkResponse({
    schema: {
      example: {
        message: 'Transaction deleted successfully',
      },
    },
  })
  remove(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.transactionsService.remove(request.user.sub, workspaceId, transactionId);
  }
}

