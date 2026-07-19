import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('Accounts')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista contas ativas do workspace' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiNotFoundResponse({ description: 'Workspace nao encontrado ou inacessivel' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 'account-id',
          workspaceId: 'workspace-id',
          name: 'Conta Principal',
          type: 'CHECKING',
          balance: '5000.00',
          includeInTotal: true,
        },
      ],
    },
  })
  list(@Request() request: AuthenticatedRequest, @Param('workspaceId') workspaceId: string) {
    return this.accountsService.list(request.user.sub, workspaceId);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma conta e a transacao genesis quando houver saldo inicial' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiBadRequestResponse({ description: 'Payload invalido ou instituicao inexistente' })
  @ApiNotFoundResponse({ description: 'Workspace nao encontrado ou sem permissao de escrita' })
  @ApiCreatedResponse({
    schema: {
      example: {
        id: 'account-id',
        workspaceId: 'workspace-id',
        institutionId: 'nubank',
        name: 'Conta Principal',
        description: 'Conta usada para despesas do mes',
        type: 'CHECKING',
        color: '#7C3AED',
        icon: 'bank',
        includeInTotal: true,
        active: true,
        createdByUserId: 'user-id',
        updatedByUserId: null,
        balance: '5000.00',
      },
    },
  })
  create(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountsService.create(request.user.sub, workspaceId, dto);
  }

  @Get(':accountId')
  @ApiOperation({ summary: 'Detalha uma conta ativa do workspace' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiParam({ name: 'accountId', example: 'account-id' })
  @ApiNotFoundResponse({ description: 'Workspace ou conta nao encontrados' })
  findOne(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.accountsService.findOne(request.user.sub, workspaceId, accountId);
  }

  @Patch(':accountId')
  @ApiOperation({ summary: 'Atualiza dados basicos de uma conta' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiParam({ name: 'accountId', example: 'account-id' })
  @ApiBadRequestResponse({ description: 'Payload invalido ou instituicao inexistente' })
  @ApiNotFoundResponse({ description: 'Workspace ou conta nao encontrados' })
  update(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(request.user.sub, workspaceId, accountId, dto);
  }

  @Delete(':accountId')
  @ApiOperation({ summary: 'Arquiva uma conta sem apagar historico financeiro' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiParam({ name: 'accountId', example: 'account-id' })
  @ApiNotFoundResponse({ description: 'Workspace ou conta nao encontrados' })
  @ApiOkResponse({
    schema: {
      example: {
        message: 'Account archived successfully',
      },
    },
  })
  archive(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.accountsService.archive(request.user.sub, workspaceId, accountId);
  }
}
