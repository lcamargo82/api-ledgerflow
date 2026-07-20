import { BadRequestException } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import type { WorkspacesService } from '../workspaces/workspaces.service';
import { CategoriesService } from './categories.service';

type PrismaCall<T> = [[T]];

type FindManyPayload = {
  where: {
    workspaceId: string;
    active: boolean;
    type: {
      not: CategoryType;
    };
  };
};

type CreatePayload = {
  data: {
    workspaceId: string;
    name: string;
    type: CategoryType;
    color: string;
    icon: string;
    createdByUserId: string;
  };
};

type UpdatePayload = {
  where: {
    id: string;
  };
  data: {
    active: boolean;
    updatedByUserId: string;
  };
};

describe('CategoriesService', () => {
  const now = new Date('2026-07-19T12:00:00.000Z');
  const category = {
    id: 'category-1',
    workspaceId: 'workspace-1',
    name: 'Alimentacao',
    type: CategoryType.EXPENSE,
    color: '#EF4444',
    icon: 'utensils',
    isSystemDefault: false,
    active: true,
    createdByUserId: 'user-1',
    updatedByUserId: null,
    createdAt: now,
    updatedAt: now,
  };

  let prisma: {
    category: {
      findMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    transaction: {
      count: jest.Mock;
    };
  };
  let workspacesService: jest.Mocked<Pick<WorkspacesService, 'assertCanRead' | 'assertCanWrite'>>;
  let service: CategoriesService;

  beforeEach(() => {
    prisma = {
      category: {
        findMany: jest.fn().mockResolvedValue([category]),
        create: jest.fn().mockResolvedValue(category),
        findFirst: jest.fn().mockResolvedValue(category),
        update: jest.fn().mockResolvedValue(category),
        delete: jest.fn(),
      },
      transaction: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    workspacesService = {
      assertCanRead: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      assertCanWrite: jest.fn().mockResolvedValue({ role: 'OWNER' }),
    };
    service = new CategoriesService(prisma as never, workspacesService as never);
  });

  it('lists active non-system categories by default', async () => {
    await service.list('user-1', 'workspace-1', {});

    expect(workspacesService.assertCanRead.mock.calls).toEqual([['user-1', 'workspace-1']]);
    const [[findManyPayload]] = prisma.category.findMany.mock.calls as PrismaCall<FindManyPayload>;
    expect(findManyPayload).toMatchObject({
      where: {
        workspaceId: 'workspace-1',
        active: true,
        type: {
          not: CategoryType.ADJUSTMENT,
        },
      },
    });
  });

  it('creates a user category with visual defaults', async () => {
    await service.create('user-1', 'workspace-1', {
      name: 'Mercado',
      type: CategoryType.EXPENSE,
    });

    expect(workspacesService.assertCanWrite.mock.calls).toEqual([['user-1', 'workspace-1']]);
    const [[createPayload]] = prisma.category.create.mock.calls as PrismaCall<CreatePayload>;
    expect(createPayload).toMatchObject({
      data: {
        workspaceId: 'workspace-1',
        name: 'Mercado',
        type: CategoryType.EXPENSE,
        color: '#64748B',
        icon: 'tag',
        createdByUserId: 'user-1',
      },
    });
  });

  it('blocks changing an adjustment category', async () => {
    prisma.category.findFirst.mockResolvedValue({
      ...category,
      type: CategoryType.ADJUSTMENT,
      isSystemDefault: true,
    });

    await expect(
      service.update('user-1', 'workspace-1', 'category-1', {
        name: 'Ajuste',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('archives a category with transaction history', async () => {
    prisma.transaction.count.mockResolvedValue(2);

    await expect(service.remove('user-1', 'workspace-1', 'category-1')).resolves.toEqual({
      message: 'Category archived successfully',
    });
    const [[updatePayload]] = prisma.category.update.mock.calls as PrismaCall<UpdatePayload>;
    expect(updatePayload).toMatchObject({
      where: {
        id: 'category-1',
      },
      data: {
        active: false,
        updatedByUserId: 'user-1',
      },
    });
    expect(prisma.category.delete.mock.calls).toHaveLength(0);
  });
});
