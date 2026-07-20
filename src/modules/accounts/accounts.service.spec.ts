import { BadRequestException } from '@nestjs/common';
import { AccountType, Prisma, TransactionType } from '@prisma/client';
import type { InstitutionsService } from '../institutions/institutions.service';
import type { WorkspacesService } from '../workspaces/workspaces.service';
import { AccountsService } from './accounts.service';

type AccountCreatePayload = {
  data: {
    workspaceId: string;
    institutionId?: string;
    createdByUserId: string;
  };
};

type TransactionCreatePayload = {
  data: {
    workspaceId: string;
    accountId: string;
    categoryId: string;
    type: TransactionType;
    amount: Prisma.Decimal;
    description: string;
    createdByUserId: string;
  };
};

describe('AccountsService', () => {
  const now = new Date('2026-07-18T12:00:00.000Z');
  const account = {
    id: 'account-1',
    workspaceId: 'workspace-1',
    institutionId: 'nubank',
    name: 'Conta Principal',
    description: null,
    type: AccountType.CHECKING,
    color: '#7C3AED',
    icon: 'bank',
    includeInTotal: true,
    active: true,
    createdByUserId: 'user-1',
    updatedByUserId: null,
    createdAt: now,
    updatedAt: now,
  };

  let prisma: {
    $transaction: jest.Mock;
    account: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    transaction: {
      groupBy: jest.Mock;
    };
    category: {
      findMany: jest.Mock;
    };
  };
  let tx: {
    account: {
      create: jest.Mock;
    };
    category: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    transaction: {
      create: jest.Mock;
    };
  };
  let workspacesService: jest.Mocked<Pick<WorkspacesService, 'assertCanRead' | 'assertCanWrite'>>;
  let institutionsService: jest.Mocked<Pick<InstitutionsService, 'exists'>>;
  let service: AccountsService;

  beforeEach(() => {
    tx = {
      account: {
        create: jest.fn().mockResolvedValue(account),
      },
      category: {
        findFirst: jest.fn().mockResolvedValue({ id: 'category-adjustment' }),
        create: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
      },
    };
    prisma = {
      $transaction: jest.fn((callback: (transactionClient: typeof tx) => unknown) => callback(tx)),
      account: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      transaction: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      category: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    workspacesService = {
      assertCanRead: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      assertCanWrite: jest.fn().mockResolvedValue({ role: 'OWNER' }),
    };
    institutionsService = {
      exists: jest.fn().mockReturnValue(true),
    };
    service = new AccountsService(
      prisma as never,
      workspacesService as never,
      institutionsService as never,
    );
  });

  it('creates an account and an initial balance transaction atomically', async () => {
    const result = await service.create('user-1', 'workspace-1', {
      name: 'Conta Principal',
      type: AccountType.CHECKING,
      institutionId: 'nubank',
      color: '#7C3AED',
      icon: 'bank',
      includeInTotal: true,
      initialBalance: 5000,
    });

    expect(workspacesService.assertCanWrite.mock.calls).toEqual([['user-1', 'workspace-1']]);
    const [[accountCreatePayload]] = tx.account.create.mock.calls as [[AccountCreatePayload]];
    const [[transactionCreatePayload]] = tx.transaction.create.mock.calls as [
      [TransactionCreatePayload],
    ];

    expect(accountCreatePayload).toMatchObject({
      data: {
        workspaceId: 'workspace-1',
        institutionId: 'nubank',
        createdByUserId: 'user-1',
      },
    });
    expect(tx.transaction.create.mock.calls).toHaveLength(1);
    expect(transactionCreatePayload).toMatchObject({
      data: {
        workspaceId: 'workspace-1',
        accountId: 'account-1',
        categoryId: 'category-adjustment',
        type: TransactionType.INCOME,
        description: 'Ajuste Inicial de Saldo',
        createdByUserId: 'user-1',
      },
    });
    expect(transactionCreatePayload.data.amount.toFixed(2)).toBe('5000.00');
    expect(result.balance).toBe('5000.00');
  });

  it('creates an expense genesis transaction for negative initial balance', async () => {
    await service.create('user-1', 'workspace-1', {
      name: 'Conta Principal',
      type: AccountType.CHECKING,
      color: '#7C3AED',
      icon: 'bank',
      initialBalance: -120,
    });

    const [[transactionCreatePayload]] = tx.transaction.create.mock.calls as [
      [TransactionCreatePayload],
    ];

    expect(transactionCreatePayload.data.type).toBe(TransactionType.EXPENSE);
    expect(transactionCreatePayload.data.amount.toFixed(2)).toBe('120.00');
  });

  it('does not create a genesis transaction when initial balance is zero', async () => {
    await service.create('user-1', 'workspace-1', {
      name: 'Carteira',
      type: AccountType.WALLET,
      color: '#16A34A',
      icon: 'wallet',
      initialBalance: 0,
    });

    expect(tx.transaction.create.mock.calls).toHaveLength(0);
  });

  it('rejects unknown institutions before creating account data', async () => {
    institutionsService.exists.mockReturnValue(false);

    await expect(
      service.create('user-1', 'workspace-1', {
        name: 'Conta Principal',
        type: AccountType.CHECKING,
        institutionId: 'unknown-bank',
        color: '#7C3AED',
        icon: 'bank',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction.mock.calls).toHaveLength(0);
  });

  it('summarizes dashboard totals respecting includeInTotal', async () => {
    prisma.account.findMany.mockResolvedValue([
      account,
      {
        ...account,
        id: 'account-2',
        includeInTotal: false,
      },
    ]);
    prisma.transaction.groupBy.mockResolvedValueOnce([
      {
        accountId: 'account-1',
        type: TransactionType.INCOME,
        _sum: {
          amount: new Prisma.Decimal(5000),
        },
      },
      {
        accountId: 'account-2',
        type: TransactionType.INCOME,
        _sum: {
          amount: new Prisma.Decimal(3000),
        },
      },
    ]);

    await expect(service.getDashboardSummary('user-1', 'workspace-1')).resolves.toMatchObject({
      workspaceId: 'workspace-1',
      currentBalance: '5000.00',
      totalIncluded: '5000.00',
      totalOverall: '8000.00',
      expensesByCategory: [],
      budgetStatus: {
        hasBudget: false,
      },
      accounts: [
        {
          id: 'account-1',
          balance: '5000.00',
        },
        {
          id: 'account-2',
          balance: '3000.00',
        },
      ],
    });
  });

  it('summarizes dashboard expenses by category for the selected month', async () => {
    prisma.account.findMany.mockResolvedValue([account]);
    prisma.transaction.groupBy
      .mockResolvedValueOnce([
        {
          accountId: 'account-1',
          type: TransactionType.INCOME,
          _sum: {
            amount: new Prisma.Decimal(1000),
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          categoryId: 'category-food',
          _sum: {
            amount: new Prisma.Decimal(250.75),
          },
        },
        {
          categoryId: 'category-home',
          _sum: {
            amount: new Prisma.Decimal(100),
          },
        },
      ]);
    prisma.category.findMany.mockResolvedValue([
      {
        id: 'category-food',
        name: 'Alimentacao',
        color: '#EF4444',
      },
      {
        id: 'category-home',
        name: 'Casa',
        color: '#A855F7',
      },
    ]);

    await expect(
      service.getDashboardSummary('user-1', 'workspace-1', 7, 2026),
    ).resolves.toMatchObject({
      expensesByCategory: [
        {
          categoryId: 'category-food',
          name: 'Alimentacao',
          color: '#EF4444',
          totalAmount: '250.75',
        },
        {
          categoryId: 'category-home',
          name: 'Casa',
          color: '#A855F7',
          totalAmount: '100.00',
        },
      ],
    });

    expect(prisma.transaction.groupBy.mock.calls[1][0]).toMatchObject({
      by: ['categoryId'],
      where: {
        workspaceId: 'workspace-1',
        type: TransactionType.EXPENSE,
        occurredAt: {
          gte: new Date('2026-07-01T00:00:00.000Z'),
          lt: new Date('2026-08-01T00:00:00.000Z'),
        },
      },
    });
  });
});
