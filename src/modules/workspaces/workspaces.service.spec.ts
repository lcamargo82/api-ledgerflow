import { CategoryType, WorkspaceRole, WorkspaceType } from '@prisma/client';
import { WorkspacesService } from './workspaces.service';

type WorkspaceCreatePayload = {
  data: {
    name: string;
    type: WorkspaceType;
    ownerUserId: string;
    members: {
      create: {
        userId: string;
        role: WorkspaceRole;
      };
    };
  };
};

type CategoryCreateManyPayload = {
  data: Array<{
    name: string;
    type: CategoryType;
    createdByUserId: string;
  }>;
};

describe('WorkspacesService', () => {
  const now = new Date('2026-07-18T12:00:00.000Z');
  const existingWorkspace = {
    id: 'workspace-1',
    name: 'Pessoal',
    type: WorkspaceType.PERSONAL,
    ownerUserId: 'user-1',
    currency: 'BRL',
    active: true,
    createdAt: now,
    updatedAt: now,
    members: [
      {
        role: WorkspaceRole.OWNER,
        joinedAt: now,
      },
    ],
  };

  let prisma: {
    $transaction: jest.Mock;
    workspace: {
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    workspaceMember: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let tx: {
    workspace: {
      create: jest.Mock;
    };
    category: {
      createMany: jest.Mock;
    };
  };
  let service: WorkspacesService;

  beforeEach(() => {
    tx = {
      workspace: {
        create: jest.fn((payload: WorkspaceCreatePayload) =>
          Promise.resolve({
            id: `workspace-${payload.data.type.toLowerCase()}`,
            name: payload.data.name,
            type: payload.data.type,
            ownerUserId: payload.data.ownerUserId,
            currency: 'BRL',
            active: true,
            createdAt: now,
            updatedAt: now,
            members: [
              {
                userId: payload.data.members.create.userId,
                role: payload.data.members.create.role,
              },
            ],
          }),
        ),
      },
      category: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma = {
      $transaction: jest.fn((callback: (transactionClient: typeof tx) => unknown) => callback(tx)),
      workspace: {
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      workspaceMember: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new WorkspacesService(prisma as never);
  });

  it('creates personal and business workspaces with owner membership and seeded categories', async () => {
    const result = await service.onboard('user-1', { choice: 'BOTH' });

    expect(result).toMatchObject({
      created: true,
      onboardingRequired: false,
      currentWorkspace: {
        id: 'workspace-personal',
        type: WorkspaceType.PERSONAL,
      },
      workspaces: [
        {
          id: 'workspace-personal',
          type: WorkspaceType.PERSONAL,
        },
        {
          id: 'workspace-business',
          type: WorkspaceType.BUSINESS,
        },
      ],
    });
    expect(tx.workspace.create.mock.calls).toHaveLength(2);
    const [[workspaceCreatePayload]] = tx.workspace.create.mock
      .calls as [[WorkspaceCreatePayload]];
    const [[categoryCreateManyPayload]] = tx.category.createMany.mock
      .calls as [[CategoryCreateManyPayload]];

    expect(workspaceCreatePayload).toMatchObject({
      data: {
        name: 'Pessoal',
        type: WorkspaceType.PERSONAL,
        ownerUserId: 'user-1',
        members: {
          create: {
            userId: 'user-1',
            role: WorkspaceRole.OWNER,
          },
        },
      },
    });
    expect(tx.category.createMany.mock.calls).toHaveLength(2);
    expect(categoryCreateManyPayload.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Ajuste Inicial de Saldo',
          type: CategoryType.ADJUSTMENT,
          createdByUserId: 'user-1',
        }),
      ]),
    );
  });

  it('returns existing workspaces instead of duplicating onboarding data', async () => {
    prisma.workspace.findMany.mockResolvedValue([existingWorkspace]);

    const result = await service.onboard('user-1', { choice: 'PERSONAL' });

    expect(result).toEqual({
      created: false,
      onboardingRequired: false,
      currentWorkspace: existingWorkspace,
      workspaces: [existingWorkspace],
    });
    expect(prisma.$transaction.mock.calls).toHaveLength(0);
  });

  it('allows writes for owner, admin and editor roles', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({
      role: WorkspaceRole.EDITOR,
    });

    await expect(service.assertCanWrite('user-1', 'workspace-1')).resolves.toMatchObject({
      role: WorkspaceRole.EDITOR,
    });
  });
});
