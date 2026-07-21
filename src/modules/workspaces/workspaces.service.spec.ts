import {
  CategoryType,
  WorkspaceInvitationStatus,
  WorkspaceRole,
  WorkspaceType,
} from '@prisma/client';
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

type WorkspaceInvitationCreatePayload = {
  data: {
    workspaceId: string;
    email: string;
    role: WorkspaceRole;
    tokenHash: string;
    invitedByUserId: string;
  };
};

type WorkspaceMemberCreatePayload = {
  data: {
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    invitedByUserId: string;
  };
};

type WorkspaceInvitationUpdatePayload = {
  where: {
    id: string;
  };
  data: {
    status: WorkspaceInvitationStatus;
    acceptedByUserId?: string;
  };
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
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    workspaceInvitation: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findFirst: jest.Mock;
    };
  };
  let tx: {
    workspace: {
      create: jest.Mock;
    };
    category: {
      createMany: jest.Mock;
    };
    workspaceMember: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    workspaceInvitation: {
      update: jest.Mock;
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
      workspaceMember: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'membership-2',
          workspaceId: 'workspace-1',
          userId: 'user-2',
          role: WorkspaceRole.EDITOR,
          joinedAt: now,
        }),
      },
      workspaceInvitation: {
        update: jest.fn().mockResolvedValue({}),
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
        findFirst: jest.fn().mockResolvedValue({ role: WorkspaceRole.OWNER }),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn(),
        delete: jest.fn(),
      },
      workspaceInvitation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({
          id: 'invitation-1',
          workspaceId: 'workspace-1',
          email: 'pessoa@example.com',
          role: WorkspaceRole.EDITOR,
          status: WorkspaceInvitationStatus.PENDING,
          expiresAt: now,
          createdAt: now,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-2',
          email: 'pessoa@example.com',
        }),
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

  it('creates a pending workspace invitation without storing the raw token', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValueOnce({ role: WorkspaceRole.OWNER });
    prisma.workspaceMember.findFirst.mockResolvedValueOnce(null);

    const result = await service.createInvitation('user-1', 'workspace-1', {
      email: 'Pessoa@Example.com',
      role: WorkspaceRole.EDITOR,
    });

    expect(result).toMatchObject({
      id: 'invitation-1',
      email: 'pessoa@example.com',
      role: WorkspaceRole.EDITOR,
    });
    expect(typeof result.acceptToken).toBe('string');
    expect(result.acceptToken).toHaveLength(64);
    const [[invitationCreatePayload]] = prisma.workspaceInvitation.create.mock.calls as [
      [WorkspaceInvitationCreatePayload],
    ];

    expect(invitationCreatePayload).toMatchObject({
      data: {
        workspaceId: 'workspace-1',
        email: 'pessoa@example.com',
        role: WorkspaceRole.EDITOR,
        invitedByUserId: 'user-1',
      },
    });
    expect(invitationCreatePayload.data.tokenHash).not.toBe(result.acceptToken);
  });

  it('accepts an invitation and creates workspace membership', async () => {
    prisma.workspaceInvitation.findFirst.mockResolvedValue({
      id: 'invitation-1',
      workspaceId: 'workspace-1',
      email: 'pessoa@example.com',
      role: WorkspaceRole.EDITOR,
      status: WorkspaceInvitationStatus.PENDING,
      tokenHash: 'hash',
      invitedByUserId: 'user-1',
      acceptedByUserId: null,
      expiresAt: new Date('2099-07-27T12:00:00.000Z'),
      acceptedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await expect(service.acceptInvitation('user-2', 'valid-token')).resolves.toMatchObject({
      id: 'membership-2',
      workspaceId: 'workspace-1',
      userId: 'user-2',
      role: WorkspaceRole.EDITOR,
    });
    const [[memberCreatePayload]] = tx.workspaceMember.create.mock.calls as [
      [WorkspaceMemberCreatePayload],
    ];
    const [[invitationUpdatePayload]] = tx.workspaceInvitation.update.mock.calls as [
      [WorkspaceInvitationUpdatePayload],
    ];

    expect(memberCreatePayload).toMatchObject({
      data: {
        workspaceId: 'workspace-1',
        userId: 'user-2',
        role: WorkspaceRole.EDITOR,
        invitedByUserId: 'user-1',
      },
    });
    expect(invitationUpdatePayload).toMatchObject({
      where: {
        id: 'invitation-1',
      },
      data: {
        status: WorkspaceInvitationStatus.ACCEPTED,
        acceptedByUserId: 'user-2',
      },
    });
  });

  it('blocks removing the last workspace owner', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValueOnce({ role: WorkspaceRole.OWNER });
    prisma.workspaceMember.findFirst.mockResolvedValueOnce({
      id: 'membership-owner',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      role: WorkspaceRole.OWNER,
    });
    prisma.workspaceMember.count.mockResolvedValue(0);

    await expect(
      service.removeMember('user-1', 'workspace-1', 'membership-owner'),
    ).rejects.toThrow('Workspace must keep at least one owner');
    expect(prisma.workspaceMember.delete.mock.calls).toHaveLength(0);
  });
});
