import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CategoryType,
  Prisma,
  TransactionOrigin,
  TransactionType,
  type Account,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { InstitutionsService } from '../institutions/institutions.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

type AccountWithBalance = Account & {
  balance: string;
};

type MonthPeriod = {
  startDate: Date;
  endDate: Date;
};

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
    private readonly institutionsService: InstitutionsService,
  ) {}

  async list(userId: string, workspaceId: string): Promise<AccountWithBalance[]> {
    await this.workspacesService.assertCanRead(userId, workspaceId);

    const accounts = await this.prisma.account.findMany({
      where: {
        workspaceId,
        active: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const balances = await this.getBalances(workspaceId);

    return accounts.map((account) => ({
      ...account,
      balance: this.formatDecimal(balances.get(account.id) ?? new Prisma.Decimal(0)),
    }));
  }

  async create(userId: string, workspaceId: string, dto: CreateAccountDto) {
    await this.workspacesService.assertCanWrite(userId, workspaceId);
    this.assertInstitutionExists(dto.institutionId);

    const initialBalance = new Prisma.Decimal(dto.initialBalance ?? 0);

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          workspaceId,
          institutionId: dto.institutionId,
          name: dto.name,
          description: dto.description,
          type: dto.type,
          color: dto.color,
          icon: dto.icon,
          includeInTotal: dto.includeInTotal ?? true,
          createdByUserId: userId,
        },
      });

      if (!initialBalance.isZero()) {
        const adjustmentCategory = await this.findOrCreateInitialBalanceCategory(
          tx,
          workspaceId,
          userId,
        );
        const isNegativeBalance = initialBalance.isNegative();

        await tx.transaction.create({
          data: {
            workspaceId,
            accountId: account.id,
            categoryId: adjustmentCategory.id,
            type: isNegativeBalance ? TransactionType.EXPENSE : TransactionType.INCOME,
            origin: TransactionOrigin.INITIAL_BALANCE,
            amount: initialBalance.abs(),
            description: 'Ajuste Inicial de Saldo',
            occurredAt: new Date(),
            createdByUserId: userId,
          },
        });
      }

      return {
        ...account,
        balance: this.formatDecimal(initialBalance),
      };
    });
  }

  async findOne(userId: string, workspaceId: string, accountId: string) {
    await this.workspacesService.assertCanRead(userId, workspaceId);

    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        workspaceId,
        active: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const balances = await this.getBalances(workspaceId, [accountId]);

    return {
      ...account,
      balance: this.formatDecimal(balances.get(account.id) ?? new Prisma.Decimal(0)),
    };
  }

  async update(userId: string, workspaceId: string, accountId: string, dto: UpdateAccountDto) {
    await this.workspacesService.assertCanWrite(userId, workspaceId);
    this.assertInstitutionExists(dto.institutionId);

    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        workspaceId,
        active: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const updatedAccount = await this.prisma.account.update({
      where: {
        id: accountId,
      },
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        institutionId: dto.institutionId,
        color: dto.color,
        icon: dto.icon,
        includeInTotal: dto.includeInTotal,
        updatedByUserId: userId,
      },
    });

    const balances = await this.getBalances(workspaceId, [accountId]);

    return {
      ...updatedAccount,
      balance: this.formatDecimal(balances.get(accountId) ?? new Prisma.Decimal(0)),
    };
  }

  async archive(userId: string, workspaceId: string, accountId: string) {
    await this.workspacesService.assertCanWrite(userId, workspaceId);

    const result = await this.prisma.account.updateMany({
      where: {
        id: accountId,
        workspaceId,
        active: true,
      },
      data: {
        active: false,
        updatedByUserId: userId,
      },
    });

    if (result.count !== 1) {
      throw new NotFoundException('Account not found');
    }

    return {
      message: 'Account archived successfully',
    };
  }

  async getDashboardSummary(userId: string, workspaceId: string, month?: number, year?: number) {
    const accounts = await this.list(userId, workspaceId);
    const totalIncluded = accounts.reduce((total, account) => {
      if (!account.includeInTotal) return total;
      return total.plus(account.balance);
    }, new Prisma.Decimal(0));
    const totalOverall = accounts.reduce(
      (total, account) => total.plus(account.balance),
      new Prisma.Decimal(0),
    );
    const expensesByCategory = await this.getExpensesByCategory(workspaceId, month, year);

    return {
      workspaceId,
      currentBalance: this.formatDecimal(totalIncluded),
      totalIncluded: this.formatDecimal(totalIncluded),
      totalOverall: this.formatDecimal(totalOverall),
      expensesByCategory,
      budgetStatus: {
        hasBudget: false,
        message: 'Voce ainda nao tem um planejamento definido para esse mes.',
      },
      accounts,
    };
  }

  async getCurrentBalance(userId: string, workspaceId: string) {
    const accounts = await this.list(userId, workspaceId);
    const currentBalance = accounts.reduce((total, account) => {
      if (!account.includeInTotal) return total;
      return total.plus(account.balance);
    }, new Prisma.Decimal(0));

    return this.formatDecimal(currentBalance);
  }

  private async getExpensesByCategory(workspaceId: string, month?: number, year?: number) {
    const period = this.resolveMonthPeriod(month, year);
    const groupedExpenses = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        workspaceId,
        type: TransactionType.EXPENSE,
        occurredAt: {
          gte: period.startDate,
          lt: period.endDate,
        },
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    const categoryIds = groupedExpenses
      .map((group) => group.categoryId)
      .filter((categoryId): categoryId is string => Boolean(categoryId));
    const categories = await this.prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
        workspaceId,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });
    const categoriesById = new Map(categories.map((category) => [category.id, category]));

    return groupedExpenses.map((group) => {
      const category = group.categoryId ? categoriesById.get(group.categoryId) : undefined;

      return {
        categoryId: group.categoryId,
        name: category?.name ?? 'Sem categoria',
        color: category?.color ?? '#64748B',
        totalAmount: this.formatDecimal(group._sum.amount ?? new Prisma.Decimal(0)),
      };
    });
  }

  private resolveMonthPeriod(month?: number, year?: number): MonthPeriod {
    const now = new Date();
    const resolvedMonth = month ?? now.getMonth() + 1;
    const resolvedYear = year ?? now.getFullYear();

    return {
      startDate: new Date(Date.UTC(resolvedYear, resolvedMonth - 1, 1)),
      endDate: new Date(Date.UTC(resolvedYear, resolvedMonth, 1)),
    };
  }

  private async getBalances(workspaceId: string, accountIds?: string[]) {
    const groupedTransactions = await this.prisma.transaction.findMany({
      where: {
        workspaceId,
        ...(accountIds
          ? {
              OR: [
                {
                  accountId: {
                    in: accountIds,
                  },
                },
                {
                  destinationAccountId: {
                    in: accountIds,
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        accountId: true,
        destinationAccountId: true,
        type: true,
        amount: true,
      },
    });

    const balances = new Map<string, Prisma.Decimal>();

    for (const transaction of groupedTransactions) {
      this.applyBalanceImpact(balances, transaction.accountId, transaction.amount, transaction.type);

      if (
        transaction.type === TransactionType.TRANSFER &&
        transaction.destinationAccountId &&
        (!accountIds || accountIds.includes(transaction.destinationAccountId))
      ) {
        const currentBalance =
          balances.get(transaction.destinationAccountId) ?? new Prisma.Decimal(0);
        balances.set(transaction.destinationAccountId, currentBalance.plus(transaction.amount));
      }
    }

    return balances;
  }

  private applyBalanceImpact(
    balances: Map<string, Prisma.Decimal>,
    accountId: string,
    amount: Prisma.Decimal,
    transactionType: TransactionType,
  ) {
    const currentBalance = balances.get(accountId) ?? new Prisma.Decimal(0);

    if (transactionType === TransactionType.EXPENSE || transactionType === TransactionType.TRANSFER) {
      balances.set(accountId, currentBalance.minus(amount));
      return;
    }

    balances.set(accountId, currentBalance.plus(amount));
  }

  private async findOrCreateInitialBalanceCategory(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    userId: string,
  ) {
    const existingCategory = await tx.category.findFirst({
      where: {
        workspaceId,
        name: 'Ajuste Inicial de Saldo',
        type: CategoryType.ADJUSTMENT,
      },
    });

    if (existingCategory) {
      return existingCategory;
    }

    return tx.category.create({
      data: {
        workspaceId,
        name: 'Ajuste Inicial de Saldo',
        type: CategoryType.ADJUSTMENT,
        isSystemDefault: true,
        createdByUserId: userId,
      },
    });
  }

  private assertInstitutionExists(institutionId?: string) {
    if (institutionId && !this.institutionsService.exists(institutionId)) {
      throw new BadRequestException('Institution not found');
    }
  }

  private formatDecimal(value: Prisma.Decimal) {
    return value.toFixed(2);
  }
}
