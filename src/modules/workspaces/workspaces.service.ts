import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CategoryType,
  Prisma,
  WorkspaceRole,
  WorkspaceType,
  type Workspace,
  type WorkspaceMember,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  CreateOnboardingWorkspacesDto,
  type OnboardingWorkspaceChoice,
} from './dto/create-onboarding-workspaces.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

const WRITE_ROLES: WorkspaceRole[] = [
  WorkspaceRole.OWNER,
  WorkspaceRole.ADMIN,
  WorkspaceRole.EDITOR,
];

type WorkspaceWithMembership = Workspace & {
  members: WorkspaceMember[];
};

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

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
