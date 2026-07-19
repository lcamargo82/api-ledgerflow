import { Body, Controller, Get, Param, Patch, Post, Request } from '@nestjs/common';
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
import { CreateOnboardingWorkspacesDto } from './dto/create-onboarding-workspaces.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@ApiTags('Workspaces')
@ApiBearerAuth('access-token')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista workspaces do usuario autenticado' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 'workspace-id',
          name: 'Pessoal',
          type: 'PERSONAL',
          currency: 'BRL',
          active: true,
        },
      ],
    },
  })
  list(@Request() request: AuthenticatedRequest) {
    return this.workspacesService.listForUser(request.user.sub);
  }

  @Post('onboarding')
  @ApiOperation({ summary: 'Cria os workspaces iniciais e categorias padrao' })
  @ApiBadRequestResponse({ description: 'Escolha de onboarding invalida' })
  @ApiCreatedResponse({
    schema: {
      example: {
        created: true,
        onboardingRequired: false,
        currentWorkspace: {
          id: 'workspace-id',
          name: 'Pessoal',
          type: 'PERSONAL',
          currency: 'BRL',
          active: true,
        },
        workspaces: [
          {
            id: 'workspace-id',
            name: 'Pessoal',
            type: 'PERSONAL',
            currency: 'BRL',
            active: true,
          },
        ],
      },
    },
  })
  onboard(@Request() request: AuthenticatedRequest, @Body() dto: CreateOnboardingWorkspacesDto) {
    return this.workspacesService.onboard(request.user.sub, dto);
  }

  @Get(':workspaceId')
  @ApiOperation({ summary: 'Retorna detalhes de um workspace acessivel' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiNotFoundResponse({ description: 'Workspace nao encontrado ou inacessivel' })
  findOne(@Request() request: AuthenticatedRequest, @Param('workspaceId') workspaceId: string) {
    return this.workspacesService.findOneForUser(request.user.sub, workspaceId);
  }

  @Patch(':workspaceId')
  @ApiOperation({ summary: 'Atualiza preferencias basicas do workspace' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiBadRequestResponse({ description: 'Payload invalido' })
  @ApiNotFoundResponse({ description: 'Workspace nao encontrado ou sem permissao de escrita' })
  update(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(request.user.sub, workspaceId, dto);
  }

  @Get(':workspaceId/members')
  @ApiOperation({ summary: 'Lista membros de um workspace' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiNotFoundResponse({ description: 'Workspace nao encontrado ou inacessivel' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 'membership-id',
          userId: 'user-id',
          role: 'OWNER',
          joinedAt: '2026-07-18T12:00:00.000Z',
          user: {
            id: 'user-id',
            name: 'Leandro Silva',
            email: 'leandro@example.com',
          },
        },
      ],
    },
  })
  listMembers(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspacesService.listMembers(request.user.sub, workspaceId);
  }
}
