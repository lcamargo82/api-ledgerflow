import { BadRequestException } from '@nestjs/common';
import { CategoryType, Prisma, TransactionOrigin, TransactionType } from '@prisma/client';
import type { AccountsService } from '../accounts/accounts.service';
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
      groupBy: jest.Mock;
    };
    account: {
      findFirst: jest.Mock;
    };
    category: {
      findFirst: jest.Mock;
    };
  };
  let workspacesService: jest.Mocked<Pick<WorkspacesService, 'assertCanRead' | 'assertCanWrite'>>;
  let accountsService: jest.Mocked<Pick<AccountsService, 'getCurrentBalance'>>;
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
        groupBy: jest.fn().mockResolvedValue([]),
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
    accountsService = {
      getCurrentBalance: jest.fn().mockResolvedValue('743.70'),
    };
    service = new TransactionsService(
      prisma as never,
      workspacesService as never,
      accountsService as never,
    );
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

  it('summarizes monthly transactions and current balance', async () => {
    prisma.transaction.groupBy.mockResolvedValue([
      {
        type: TransactionType.INCOME,
        _sum: {
          amount: new Prisma.Decimal(500),
        },
      },
      {
        type: TransactionType.EXPENSE,
        _sum: {
          amount: new Prisma.Decimal(1256.3),
        },
      },
    ]);

    await expect(service.getMonthlySummary('user-1', 'workspace-1', 7, 2026)).resolves.toEqual({
      currentBalance: '743.70',
      monthlyBalance: '-756.30',
      totalIncomes: '500.00',
      totalExpenses: '1256.30',
    });

    expect(workspacesService.assertCanRead.mock.calls).toContainEqual(['user-1', 'workspace-1']);
    expect(accountsService.getCurrentBalance.mock.calls).toEqual([['user-1', 'workspace-1']]);
    expect(prisma.transaction.groupBy.mock.calls[0][0]).toMatchObject({
      by: ['type'],
      where: {
        workspaceId: 'workspace-1',
        occurredAt: {
          gte: new Date('2026-07-01T00:00:00.000Z'),
          lt: new Date('2026-08-01T00:00:00.000Z'),
        },
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
