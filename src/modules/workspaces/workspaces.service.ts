import { randomBytes, createHash } from 'crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CategoryType,
  Prisma,
  WorkspaceInvitationStatus,
  WorkspaceRole,
  WorkspaceType,
  type Workspace,
  type WorkspaceMember,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  CreateOnboardingWorkspacesDto,
  type OnboardingWorkspaceChoice,
} from './dto/create-onboarding-workspaces.dto';
import { CreateWorkspaceInvitationDto } from './dto/create-workspace-invitation.dto';
import { UpdateWorkspaceMemberDto } from './dto/update-workspace-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

const WRITE_ROLES: WorkspaceRole[] = [
  WorkspaceRole.OWNER,
  WorkspaceRole.ADMIN,
  WorkspaceRole.EDITOR,
];
const MANAGE_MEMBER_ROLES: WorkspaceRole[] = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN];
const INVITATION_EXPIRATION_DAYS = 7;

type WorkspaceWithMembership = Workspace & {
  members: WorkspaceMember[];
};

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  async listForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        active: true,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
            joinedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getOnboardingStatus(userId: string) {
    const workspaces = await this.listForUser(userId);

    return {
      onboardingRequired: workspaces.length === 0,
      currentWorkspace: workspaces[0] ?? null,
      workspaces,
    };
  }

  async onboard(userId: string, dto: CreateOnboardingWorkspacesDto) {
    const existingWorkspaces = await this.listForUser(userId);

    if (existingWorkspaces.length > 0) {
      return {
        created: false,
        onboardingRequired: false,
        currentWorkspace: existingWorkspaces[0],
        workspaces: existingWorkspaces,
      };
    }

    const workspaceTypes = this.resolveWorkspaceTypes(dto.choice);

    const workspaces = await this.prisma.$transaction(async (tx) => {
      const createdWorkspaces: WorkspaceWithMembership[] = [];

      for (const type of workspaceTypes) {
        const workspace = await tx.workspace.create({
          data: {
            name: this.getDefaultWorkspaceName(type),
            type,
            ownerUserId: userId,
            members: {
              create: {
                userId,
                role: WorkspaceRole.OWNER,
              },
            },
          },
          include: {
            members: true,
          },
        });

        await this.seedCategories(tx, workspace.id, userId, type);
        createdWorkspaces.push(workspace);
      }

      return createdWorkspaces;
    });

    return {
      created: true,
      onboardingRequired: false,
      currentWorkspace: workspaces[0],
      workspaces,
    };
  }

  async findOneForUser(userId: string, workspaceId: string) {
    await this.assertCanRead(userId, workspaceId);

    return this.prisma.workspace.findUniqueOrThrow({
      where: {
        id: workspaceId,
      },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            joinedAt: true,
          },
        },
      },
    });
  }

  async update(userId: string, workspaceId: string, dto: UpdateWorkspaceDto) {
    await this.assertCanWrite(userId, workspaceId);

    return this.prisma.workspace.update({
      where: {
        id: workspaceId,
      },
      data: {
        name: dto.name,
        currency: dto.currency,
      },
    });
  }

  async listMembers(userId: string, workspaceId: string) {
    await this.assertCanRead(userId, workspaceId);

    return this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
      },
      select: {
        id: true,
        userId: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });
  }

  async listInvitations(userId: string, workspaceId: string) {
    await this.assertCanManageMembers(userId, workspaceId);

    return this.prisma.workspaceInvitation.findMany({
      where: {
        workspaceId,
      },
      select: {
        id: true,
        workspaceId: true,
        email: true,
        role: true,
        status: true,
        invitedByUserId: true,
        acceptedByUserId: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createInvitation(
    userId: string,
    workspaceId: string,
    dto: CreateWorkspaceInvitationDto,
  ) {
    await this.assertCanManageMembers(userId, workspaceId);
    this.assertAssignableRole(dto.role);

    const email = dto.email.trim().toLowerCase();
    await this.assertEmailIsNotMember(workspaceId, email);
    await this.assertNoPendingInvitation(workspaceId, email);

    const token = this.generateInvitationToken();
    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email,
        role: dto.role,
        tokenHash: this.hashInvitationToken(token),
        invitedByUserId: userId,
        expiresAt: this.getInvitationExpirationDate(),
      },
      select: {
        id: true,
        workspaceId: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    await this.sendWorkspaceInvitationEmail(email, token, invitation);

    return {
      ...invitation,
      acceptToken: token,
    };
  }

  async acceptInvitation(userId: string, token: string) {
    const user = await this.findActiveUserOrFail(userId);
    const invitation = await this.findInvitationByTokenOrFail(token);
    this.assertInvitationCanBeAnswered(invitation, user.email);

    return this.prisma.$transaction(async (tx) => {
      const existingMember = await tx.workspaceMember.findFirst({
        where: {
          workspaceId: invitation.workspaceId,
          userId,
        },
      });

      if (existingMember) {
        throw new BadRequestException('User is already a workspace member');
      }

      const membership = await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
          invitedByUserId: invitation.invitedByUserId,
        },
        select: {
          id: true,
          workspaceId: true,
          userId: true,
          role: true,
          joinedAt: true,
        },
      });

      await tx.workspaceInvitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          status: WorkspaceInvitationStatus.ACCEPTED,
          acceptedByUserId: userId,
          acceptedAt: new Date(),
        },
      });

      return membership;
    });
  }

  async declineInvitation(userId: string, token: string) {
    const user = await this.findActiveUserOrFail(userId);
    const invitation = await this.findInvitationByTokenOrFail(token);
    this.assertInvitationCanBeAnswered(invitation, user.email);

    await this.prisma.workspaceInvitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: WorkspaceInvitationStatus.DECLINED,
      },
    });

    return {
      message: 'Invitation declined successfully',
    };
  }

  async cancelInvitation(userId: string, workspaceId: string, invitationId: string) {
    await this.assertCanManageMembers(userId, workspaceId);

    const result = await this.prisma.workspaceInvitation.updateMany({
      where: {
        id: invitationId,
        workspaceId,
        status: WorkspaceInvitationStatus.PENDING,
      },
      data: {
        status: WorkspaceInvitationStatus.CANCELED,
      },
    });

    if (result.count !== 1) {
      throw new NotFoundException('Invitation not found');
    }

    return {
      message: 'Invitation canceled successfully',
    };
  }

  async updateMember(
    userId: string,
    workspaceId: string,
    memberId: string,
    dto: UpdateWorkspaceMemberDto,
  ) {
    await this.assertCanManageMembers(userId, workspaceId);
    this.assertAssignableRole(dto.role);

    const member = await this.findMemberOrFail(workspaceId, memberId);

    if (member.role === WorkspaceRole.OWNER && dto.role !== WorkspaceRole.OWNER) {
      await this.assertWorkspaceHasAnotherOwner(workspaceId, member.id);
    }

    return this.prisma.workspaceMember.update({
      where: {
        id: memberId,
      },
      data: {
        role: dto.role,
      },
      select: {
        id: true,
        userId: true,
        role: true,
        joinedAt: true,
      },
    });
  }

  async removeMember(userId: string, workspaceId: string, memberId: string) {
    await this.assertCanManageMembers(userId, workspaceId);

    const member = await this.findMemberOrFail(workspaceId, memberId);

    if (member.role === WorkspaceRole.OWNER) {
      await this.assertWorkspaceHasAnotherOwner(workspaceId, member.id);
    }

    await this.prisma.workspaceMember.delete({
      where: {
        id: memberId,
      },
    });

    return {
      message: 'Workspace member removed successfully',
    };
  }

  async assertCanRead(userId: string, workspaceId: string) {
    const membership = await this.findMembership(userId, workspaceId);

    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }

    return membership;
  }

  async assertCanWrite(userId: string, workspaceId: string) {
    const membership = await this.assertCanRead(userId, workspaceId);

    if (!WRITE_ROLES.includes(membership.role)) {
      throw new NotFoundException('Workspace not found');
    }

    return membership;
  }

  private async assertCanManageMembers(userId: string, workspaceId: string) {
    const membership = await this.assertCanRead(userId, workspaceId);

    if (!MANAGE_MEMBER_ROLES.includes(membership.role)) {
      throw new NotFoundException('Workspace not found');
    }

    return membership;
  }

  private findMembership(userId: string, workspaceId: string) {
    return this.prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId,
        workspace: {
          active: true,
        },
      },
    });
  }

  private assertAssignableRole(role: WorkspaceRole) {
    if (role === WorkspaceRole.OWNER) {
      throw new BadRequestException('OWNER role cannot be assigned through this flow');
    }
  }

  private async assertEmailIsNotMember(workspaceId: string, email: string) {
    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: {
          email,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a workspace member');
    }
  }

  private async assertNoPendingInvitation(workspaceId: string, email: string) {
    const existingInvitation = await this.prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId,
        email,
        status: WorkspaceInvitationStatus.PENDING,
      },
      select: {
        id: true,
      },
    });

    if (existingInvitation) {
      throw new BadRequestException('There is already a pending invitation for this email');
    }
  }

  private async findActiveUserOrFail(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        active: true,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async findInvitationByTokenOrFail(token: string) {
    const invitation = await this.prisma.workspaceInvitation.findFirst({
      where: {
        tokenHash: this.hashInvitationToken(token),
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  private assertInvitationCanBeAnswered(
    invitation: {
      email: string;
      status: WorkspaceInvitationStatus;
      expiresAt: Date;
    },
    userEmail: string,
  ) {
    if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is not pending');
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Invitation is expired');
    }

    if (invitation.email !== userEmail.toLowerCase()) {
      throw new BadRequestException('Invitation belongs to another email');
    }
  }

  private async findMemberOrFail(workspaceId: string, memberId: string) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    });

    if (!member) {
      throw new NotFoundException('Workspace member not found');
    }

    return member;
  }

  private async assertWorkspaceHasAnotherOwner(workspaceId: string, ignoredMemberId: string) {
    const ownerCount = await this.prisma.workspaceMember.count({
      where: {
        workspaceId,
        role: WorkspaceRole.OWNER,
        id: {
          not: ignoredMemberId,
        },
      },
    });

    if (ownerCount < 1) {
      throw new BadRequestException('Workspace must keep at least one owner');
    }
  }

  private generateInvitationToken() {
    return randomBytes(32).toString('hex');
  }

  private hashInvitationToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getInvitationExpirationDate() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRATION_DAYS);

    return expiresAt;
  }

  private async sendWorkspaceInvitationEmail(
    email: string,
    token: string,
    invitation: {
      role: WorkspaceRole;
      expiresAt: Date;
    },
  ) {
    const appUrl = this.config.get<string>('APP_WEB_URL', 'https://app.ledgerflow.local');
    const acceptUrl = `${appUrl}/workspace-invitations/accept?token=${token}`;

    try {
      await this.emailService.send({
        to: email,
        subject: 'Convite para workspace no LedgerFlow',
        text: [
          'Voce recebeu um convite para acessar um workspace no LedgerFlow.',
          `Role: ${invitation.role}`,
          `Aceite pelo link: ${acceptUrl}`,
          `Ou use este token no app: ${token}`,
          `O convite expira em: ${invitation.expiresAt.toISOString()}`,
        ].join('\n'),
        html: `
          <p>Voce recebeu um convite para acessar um workspace no LedgerFlow.</p>
          <p><strong>Role:</strong> ${invitation.role}</p>
          <p><a href="${acceptUrl}">Aceitar convite</a></p>
          <p>Se o link nao abrir no app, use este token:</p>
          <pre>${token}</pre>
          <p>O convite expira em ${invitation.expiresAt.toISOString()}.</p>
        `,
      });
    } catch (error) {
      this.logger.warn(
        `Workspace invitation email could not be sent to ${email}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private resolveWorkspaceTypes(choice: OnboardingWorkspaceChoice) {
    if (choice === 'BOTH') {
      return [WorkspaceType.PERSONAL, WorkspaceType.BUSINESS];
    }

    return [choice === 'PERSONAL' ? WorkspaceType.PERSONAL : WorkspaceType.BUSINESS];
  }

  private getDefaultWorkspaceName(type: WorkspaceType) {
    return type === WorkspaceType.PERSONAL ? 'Pessoal' : 'Negócios';
  }

  private async seedCategories(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    userId: string,
    workspaceType: WorkspaceType,
  ) {
    const categories = [
      ...this.getIncomeCategories(workspaceType).map((name) => ({
        workspaceId,
        name,
        type: CategoryType.INCOME,
        isSystemDefault: true,
        createdByUserId: userId,
      })),
      ...this.getExpenseCategories(workspaceType).map((name) => ({
        workspaceId,
        name,
        type: CategoryType.EXPENSE,
        isSystemDefault: true,
        createdByUserId: userId,
      })),
      {
        workspaceId,
        name: 'Ajuste Inicial de Saldo',
        type: CategoryType.ADJUSTMENT,
        isSystemDefault: true,
        createdByUserId: userId,
      },
    ];

    await tx.category.createMany({
      data: categories,
      skipDuplicates: true,
    });
  }

  private getIncomeCategories(workspaceType: WorkspaceType) {
    if (workspaceType === WorkspaceType.PERSONAL) {
      return ['Salário', 'Rendimentos', 'Reembolso', 'Presentes', 'Outros'];
    }

    return ['Vendas', 'Prestação de Serviços', 'Rendimentos', 'Reembolso', 'Outros'];
  }

  private getExpenseCategories(workspaceType: WorkspaceType) {
    if (workspaceType === WorkspaceType.PERSONAL) {
      return [
        'Moradia',
        'Alimentação',
        'Transporte',
        'Saúde',
        'Educação',
        'Lazer',
        'Assinaturas',
        'Compras',
        'Impostos e Taxas',
        'Outros',
      ];
    }

    return [
      'Fornecedores',
      'Logística',
      'Impostos',
      'Folha de Pagamento',
      'Marketing',
      'Infraestrutura',
      'Softwares e Assinaturas',
      'Taxas Bancárias',
      'Contabilidade',
      'Outros',
    ];
  }
}
