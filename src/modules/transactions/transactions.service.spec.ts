import { BadRequestException } from '@nestjs/common';
import { CategoryType, Prisma, TransactionOrigin, TransactionType } from '@prisma/client';
import type { WorkspacesService } from '../workspaces/workspaces.service';
import { TransactionsService } from './transactions.service';

type PrismaCall<T> = [[T]];

type AccountFindPayload = {
  where: {
    id: string;
    workspaceId: string;
    active: boolean;
  };
};

type TransactionCreatePayload = {
  data: {
    workspaceId: string;
    accountId: string;
    categoryId: string;
    type: TransactionType;
    origin: TransactionOrigin;
    description: string;
    createdByUserId: string;
  };
};

describe('TransactionsService', () => {
  const now = new Date('2026-07-19T12:00:00.000Z');
  const transaction = {
    id: 'transaction-1',
    workspaceId: 'workspace-1',
    accountId: 'account-1',
    categoryId: 'category-1',
    type: TransactionType.EXPENSE,
    origin: TransactionOrigin.MANUAL,
    amount: new Prisma.Decimal(150.5),
    description: 'Jantar',
    occurredAt: now,
    createdByUserId: 'user-1',
    updatedByUserId: null,
    createdAt: now,
    updatedAt: now,
    account: {
      id: 'account-1',
      name: 'Conta Principal',
      type: 'CHECKING',
      color: '#7C3AED',
      icon: 'bank',
    },
    category: {
      id: 'category-1',
      name: 'Alimentacao',
      type: CategoryType.EXPENSE,
      color: '#EF4444',
      icon: 'utensils',
    },
  };

  let prisma: {
    $transaction: jest.Mock;
    transaction: {
      count: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    account: {
      findFirst: jest.Mock;
    };
    category: {
      findFirst: jest.Mock;
    };
  };
  let workspacesService: jest.Mocked<Pick<WorkspacesService, 'assertCanRead' | 'assertCanWrite'>>;
  let service: TransactionsService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn().mockResolvedValue([1, [transaction]]),
      transaction: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([transaction]),
        create: jest.fn().mockResolvedValue(transaction),
        findFirst: jest.fn().mockResolvedValue(transaction),
        update: jest.fn().mockResolvedValue(transaction),
        delete: jest.fn(),
      },
      account: {
        findFirst: jest.fn().mockResolvedValue({ id: 'account-1' }),
      },
      category: {
        findFirst: jest.fn().mockResolvedValue({ type: CategoryType.EXPENSE }),
      },
    };
    workspacesService = {
      assertCanRead: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      assertCanWrite: jest.fn().mockResolvedValue({ role: 'OWNER' }),
    };
    service = new TransactionsService(prisma as never, workspacesService as never);
  });

  it('creates a manual expense transaction', async () => {
    const result = await service.create('user-1', 'workspace-1', {
      accountId: 'account-1',
      categoryId: 'category-1',
      type: TransactionType.EXPENSE,
      amount: 150.5,
      occurredAt: now.toISOString(),
      description: 'Jantar',
    });

    expect(workspacesService.assertCanWrite.mock.calls).toEqual([['user-1', 'workspace-1']]);
    const [[accountFindPayload]] = prisma.account.findFirst.mock
      .calls as PrismaCall<AccountFindPayload>;
    expect(accountFindPayload).toMatchObject({
      where: {
        id: 'account-1',
        workspaceId: 'workspace-1',
        active: true,
      },
    });
    const [[transactionCreatePayload]] = prisma.transaction.create.mock
      .calls as PrismaCall<TransactionCreatePayload>;
    expect(transactionCreatePayload).toMatchObject({
      data: {
        workspaceId: 'workspace-1',
        accountId: 'account-1',
        categoryId: 'category-1',
        type: TransactionType.EXPENSE,
        origin: TransactionOrigin.MANUAL,
        description: 'Jantar',
        createdByUserId: 'user-1',
      },
    });
    expect(result.amount).toBe('150.50');
  });

  it('rejects incompatible category type', async () => {
    prisma.category.findFirst.mockResolvedValue({ type: CategoryType.INCOME });

    await expect(
      service.create('user-1', 'workspace-1', {
        accountId: 'account-1',
        categoryId: 'category-1',
        type: TransactionType.EXPENSE,
        amount: 150.5,
        occurredAt: now.toISOString(),
        description: 'Jantar',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists transactions with pagination metadata', async () => {
    await expect(service.list('user-1', 'workspace-1', { page: 1, perPage: 20 })).resolves.toEqual({
      data: [
        expect.objectContaining({
          id: 'transaction-1',
          amount: '150.50',
        }),
      ],
      meta: {
        page: 1,
        perPage: 20,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('blocks changing system transactions', async () => {
    prisma.transaction.findFirst.mockResolvedValue({
      ...transaction,
      origin: TransactionOrigin.INITIAL_BALANCE,
    });

    await expect(
      service.update('user-1', 'workspace-1', 'transaction-1', {
        description: 'Novo texto',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
