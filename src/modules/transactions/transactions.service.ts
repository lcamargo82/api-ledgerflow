import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CategoryType,
  Prisma,
  TransactionOrigin,
  TransactionType,
  type Transaction,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

type TransactionWithRelations = Transaction & {
  account?: {
    id: string;
    name: string;
    type: string;
    color: string;
    icon: string;
  };
  destinationAccount?: {
    id: string;
    name: string;
    type: string;
    color: string;
    icon: string;
  } | null;
  category?: {
    id: string;
    name: string;
    type: CategoryType;
    color: string;
    icon: string;
  } | null;
};

type MonthPeriod = {
  startDate: Date;
  endDate: Date;
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
    private readonly accountsService: AccountsService,
  ) {}

  async list(userId: string, workspaceId: string, filters: ListTransactionsDto) {
    await this.workspacesService.assertCanRead(userId, workspaceId);

    const page = filters.page ?? 1;
    const perPage = filters.perPage ?? 20;
    const where = this.buildListWhere(workspaceId, filters);

    const [total, transactions] = await this.prisma.$transaction([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        include: this.getInclude(),
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return {
      data: transactions.map((transaction) => this.serialize(transaction)),
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async create(userId: string, workspaceId: string, dto: CreateTransactionDto) {
    await this.workspacesService.assertCanWrite(userId, workspaceId);
    await this.validateTransactionInput(workspaceId, {
      accountId: dto.accountId,
      destinationAccountId: dto.destinationAccountId,
      categoryId: dto.categoryId,
      type: dto.type,
      amount: new Prisma.Decimal(dto.amount),
    });

    const transaction = await this.prisma.transaction.create({
      data: {
        workspaceId,
        accountId: dto.accountId,
        destinationAccountId:
          dto.type === TransactionType.TRANSFER ? dto.destinationAccountId : null,
        categoryId: dto.type === TransactionType.TRANSFER ? null : dto.categoryId,
        type: dto.type,
        origin: TransactionOrigin.MANUAL,
        amount: new Prisma.Decimal(dto.amount),
        occurredAt: new Date(dto.occurredAt),
        description: dto.description,
        createdByUserId: userId,
      },
      include: this.getInclude(),
    });

    return this.serialize(transaction);
  }

  async getMonthlySummary(userId: string, workspaceId: string, month?: number, year?: number) {
    await this.workspacesService.assertCanRead(userId, workspaceId);

    const period = this.resolveMonthPeriod(month, year);
    const [groupedTransactions, currentBalance] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: {
          workspaceId,
          occurredAt: {
            gte: period.startDate,
            lt: period.endDate,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.accountsService.getCurrentBalance(userId, workspaceId),
    ]);

    const totalIncomes = this.getGroupedAmount(groupedTransactions, TransactionType.INCOME);
    const totalExpenses = this.getGroupedAmount(groupedTransactions, TransactionType.EXPENSE);

    return {
      currentBalance,
      monthlyBalance: this.formatDecimal(totalIncomes.minus(totalExpenses)),
      totalIncomes: this.formatDecimal(totalIncomes),
      totalExpenses: this.formatDecimal(totalExpenses),
    };
  }

  async findOne(userId: string, workspaceId: string, transactionId: string) {
    await this.workspacesService.assertCanRead(userId, workspaceId);

    const transaction = await this.findTransactionOrFail(workspaceId, transactionId);

    return this.serialize(transaction);
  }

  async update(
    userId: string,
    workspaceId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
  ) {
    await this.workspacesService.assertCanWrite(userId, workspaceId);

    const existingTransaction = await this.findTransactionOrFail(workspaceId, transactionId);
    this.assertManualTransaction(existingTransaction);

    const nextAccountId = dto.accountId ?? existingTransaction.accountId;
    const nextType = dto.type ?? existingTransaction.type;
    const nextDestinationAccountId =
      dto.destinationAccountId === undefined
        ? existingTransaction.destinationAccountId
        : dto.destinationAccountId;
    const nextCategoryId =
      nextType === TransactionType.TRANSFER
        ? null
        : dto.categoryId === undefined
          ? existingTransaction.categoryId
          : dto.categoryId;
    const nextAmount =
      dto.amount === undefined ? existingTransaction.amount : new Prisma.Decimal(dto.amount);

    await this.validateTransactionInput(
      workspaceId,
      {
        accountId: nextAccountId,
        destinationAccountId: nextDestinationAccountId,
        categoryId: nextCategoryId,
        type: nextType,
        amount: nextAmount,
      },
      existingTransaction.id,
    );

    const transaction = await this.prisma.transaction.update({
      where: {
        id: transactionId,
      },
      data: {
        accountId: dto.accountId,
        destinationAccountId:
          nextType === TransactionType.TRANSFER ? nextDestinationAccountId : null,
        categoryId: nextType === TransactionType.TRANSFER ? null : dto.categoryId,
        type: dto.type,
        amount: dto.amount === undefined ? undefined : new Prisma.Decimal(dto.amount),
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        description: dto.description,
        updatedByUserId: userId,
      },
      include: this.getInclude(),
    });

    return this.serialize(transaction);
  }

  async remove(userId: string, workspaceId: string, transactionId: string) {
    await this.workspacesService.assertCanWrite(userId, workspaceId);

    const transaction = await this.findTransactionOrFail(workspaceId, transactionId);
    this.assertManualTransaction(transaction);

    await this.prisma.transaction.delete({
      where: {
        id: transactionId,
      },
    });

    return {
      message: 'Transaction deleted successfully',
    };
  }

  private buildListWhere(
    workspaceId: string,
    filters: ListTransactionsDto,
  ): Prisma.TransactionWhereInput {
    return {
      workspaceId,
      ...(filters.accountId
        ? {
            OR: [{ accountId: filters.accountId }, { destinationAccountId: filters.accountId }],
          }
        : {}),
      categoryId: filters.categoryId,
      type: filters.type,
      origin: filters.origin,
      ...(filters.startDate || filters.endDate
        ? {
            occurredAt: {
              ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
              ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            description: {
              contains: filters.search,
              mode: 'insensitive',
            },
          }
        : {}),
    };
  }

  private getGroupedAmount(
    groupedTransactions: Array<{
      type: TransactionType;
      _sum: {
        amount: Prisma.Decimal | null;
      };
    }>,
    type: TransactionType,
  ) {
    return (
      groupedTransactions.find((groupedTransaction) => groupedTransaction.type === type)?._sum
        .amount ?? new Prisma.Decimal(0)
    );
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

  private async findTransactionOrFail(workspaceId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        workspaceId,
      },
      include: this.getInclude(),
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  private async assertAccountBelongsToWorkspace(workspaceId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        workspaceId,
        active: true,
      },
      select: {
        id: true,
      },
    });

    if (!account) {
      throw new BadRequestException('Account not found for this workspace');
    }
  }

  private async validateTransactionInput(
    workspaceId: string,
    input: {
      accountId: string;
      destinationAccountId?: string | null;
      categoryId?: string | null;
      type: TransactionType;
      amount: Prisma.Decimal;
    },
    ignoredTransactionId?: string,
  ) {
    await this.assertAccountBelongsToWorkspace(workspaceId, input.accountId);

    if (input.type === TransactionType.TRANSFER) {
      if (!input.destinationAccountId) {
        throw new BadRequestException('Destination account is required for transfers');
      }

      if (input.destinationAccountId === input.accountId) {
        throw new BadRequestException('Origin and destination accounts must be different');
      }

      await this.assertAccountBelongsToWorkspace(workspaceId, input.destinationAccountId);
      await this.assertSufficientBalanceForTransfer(
        workspaceId,
        input.accountId,
        input.amount,
        ignoredTransactionId,
      );
      return;
    }

    if (!input.categoryId) {
      throw new BadRequestException('Category is required for manual transactions');
    }

    if (input.destinationAccountId) {
      throw new BadRequestException('Destination account is allowed only for transfers');
    }

    await this.assertCategoryMatchesTransaction(workspaceId, input.categoryId, input.type);
  }

  private async assertSufficientBalanceForTransfer(
    workspaceId: string,
    accountId: string,
    amount: Prisma.Decimal,
    ignoredTransactionId?: string,
  ) {
    const balance = await this.getAccountBalance(workspaceId, accountId, ignoredTransactionId);

    if (balance.lessThan(amount)) {
      throw new BadRequestException('Insufficient balance for transfer');
    }
  }

  private async getAccountBalance(
    workspaceId: string,
    accountId: string,
    ignoredTransactionId?: string,
  ) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        workspaceId,
        ...(ignoredTransactionId ? { id: { not: ignoredTransactionId } } : {}),
        OR: [{ accountId }, { destinationAccountId: accountId }],
      },
      select: {
        accountId: true,
        destinationAccountId: true,
        type: true,
        amount: true,
      },
    });

    return transactions.reduce((balance, transaction) => {
      if (transaction.type === TransactionType.INCOME && transaction.accountId === accountId) {
        return balance.plus(transaction.amount);
      }

      if (transaction.type === TransactionType.EXPENSE && transaction.accountId === accountId) {
        return balance.minus(transaction.amount);
      }

      if (transaction.type === TransactionType.TRANSFER) {
        if (transaction.accountId === accountId) {
          return balance.minus(transaction.amount);
        }

        if (transaction.destinationAccountId === accountId) {
          return balance.plus(transaction.amount);
        }
      }

      return balance;
    }, new Prisma.Decimal(0));
  }

  private async assertCategoryMatchesTransaction(
    workspaceId: string,
    categoryId: string,
    transactionType: TransactionType,
  ) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        workspaceId,
        active: true,
      },
      select: {
        type: true,
      },
    });

    if (!category) {
      throw new BadRequestException('Category not found for this workspace');
    }

    const expectedCategoryType =
      transactionType === TransactionType.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE;

    if (category.type !== expectedCategoryType) {
      throw new BadRequestException('Category type is incompatible with transaction type');
    }
  }

  private assertManualTransaction(transaction: Transaction) {
    if (transaction.origin !== TransactionOrigin.MANUAL) {
      throw new BadRequestException('System transactions cannot be changed here');
    }
  }

  private getInclude() {
    return {
      account: {
        select: {
          id: true,
          name: true,
          type: true,
          color: true,
          icon: true,
        },
      },
      destinationAccount: {
        select: {
          id: true,
          name: true,
          type: true,
          color: true,
          icon: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          type: true,
          color: true,
          icon: true,
        },
      },
    };
  }

  private serialize(transaction: TransactionWithRelations) {
    return {
      ...transaction,
      amount: this.formatDecimal(transaction.amount),
    };
  }

  private formatDecimal(value: Prisma.Decimal) {
    return value.toFixed(2);
  }
}
