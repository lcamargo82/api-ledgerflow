import { Body, Controller, Delete, Get, Param, Patch, Post, Request } from '@nestjs/common';
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
import { CreateWorkspaceInvitationDto } from './dto/create-workspace-invitation.dto';
import { RespondWorkspaceInvitationDto } from './dto/respond-workspace-invitation.dto';
import { UpdateWorkspaceMemberDto } from './dto/update-workspace-member.dto';
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

  @Get(':workspaceId/invitations')
  @ApiOperation({ summary: 'Lista convites de um workspace' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiNotFoundResponse({ description: 'Workspace nao encontrado ou sem permissao de gestao' })
  listInvitations(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspacesService.listInvitations(request.user.sub, workspaceId);
  }

  @Post(':workspaceId/invitations')
  @ApiOperation({ summary: 'Cria convite para um workspace' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiBadRequestResponse({ description: 'Convite invalido, duplicado ou membro ja existente' })
  @ApiNotFoundResponse({ description: 'Workspace nao encontrado ou sem permissao de gestao' })
  @ApiCreatedResponse({
    schema: {
      example: {
        id: 'invitation-id',
        workspaceId: 'workspace-id',
        email: 'pessoa@example.com',
        role: 'EDITOR',
        status: 'PENDING',
        expiresAt: '2026-07-27T12:00:00.000Z',
        acceptToken: 'token-exibido-apenas-na-criacao',
      },
    },
  })
  createInvitation(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWorkspaceInvitationDto,
  ) {
    return this.workspacesService.createInvitation(request.user.sub, workspaceId, dto);
  }

  @Delete(':workspaceId/invitations/:invitationId')
  @ApiOperation({ summary: 'Cancela um convite pendente' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiParam({ name: 'invitationId', example: 'invitation-id' })
  @ApiNotFoundResponse({ description: 'Workspace, convite ou permissao nao encontrados' })
  cancelInvitation(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.workspacesService.cancelInvitation(request.user.sub, workspaceId, invitationId);
  }

  @Patch(':workspaceId/members/:memberId')
  @ApiOperation({ summary: 'Altera role de um membro do workspace' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiParam({ name: 'memberId', example: 'membership-id' })
  @ApiBadRequestResponse({ description: 'Role invalida ou ultimo OWNER protegido' })
  @ApiNotFoundResponse({ description: 'Workspace, membro ou permissao nao encontrados' })
  updateMember(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateWorkspaceMemberDto,
  ) {
    return this.workspacesService.updateMember(request.user.sub, workspaceId, memberId, dto);
  }

  @Delete(':workspaceId/members/:memberId')
  @ApiOperation({ summary: 'Remove membro de um workspace' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiParam({ name: 'memberId', example: 'membership-id' })
  @ApiBadRequestResponse({ description: 'Ultimo OWNER protegido' })
  @ApiNotFoundResponse({ description: 'Workspace, membro ou permissao nao encontrados' })
  removeMember(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.workspacesService.removeMember(request.user.sub, workspaceId, memberId);
  }
}

@ApiTags('Workspace Invitations')
@ApiBearerAuth('access-token')
@Controller('workspace-invitations')
export class WorkspaceInvitationsController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post('accept')
  @ApiOperation({ summary: 'Aceita um convite de workspace' })
  @ApiBadRequestResponse({ description: 'Convite invalido, expirado ou de outro email' })
  @ApiNotFoundResponse({ description: 'Convite nao encontrado' })
  acceptInvitation(
    @Request() request: AuthenticatedRequest,
    @Body() dto: RespondWorkspaceInvitationDto,
  ) {
    return this.workspacesService.acceptInvitation(request.user.sub, dto.token);
  }

  @Post('decline')
  @ApiOperation({ summary: 'Recusa um convite de workspace' })
  @ApiBadRequestResponse({ description: 'Convite invalido, expirado ou de outro email' })
  @ApiNotFoundResponse({ description: 'Convite nao encontrado' })
  declineInvitation(
    @Request() request: AuthenticatedRequest,
    @Body() dto: RespondWorkspaceInvitationDto,
  ) {
    return this.workspacesService.declineInvitation(request.user.sub, dto.token);
  }
}
