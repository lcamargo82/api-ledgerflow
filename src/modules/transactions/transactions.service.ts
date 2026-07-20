import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryType, Prisma, TransactionOrigin, TransactionType, type Transaction } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
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
  category?: {
    id: string;
    name: string;
    type: CategoryType;
    color: string;
    icon: string;
  } | null;
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
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
    await this.assertAccountBelongsToWorkspace(workspaceId, dto.accountId);
    await this.assertCategoryMatchesTransaction(workspaceId, dto.categoryId, dto.type);

    const transaction = await this.prisma.transaction.create({
      data: {
        workspaceId,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
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
    const nextCategoryId = dto.categoryId ?? existingTransaction.categoryId;
    const nextType = dto.type ?? existingTransaction.type;

    await this.assertAccountBelongsToWorkspace(workspaceId, nextAccountId);

    if (!nextCategoryId) {
      throw new BadRequestException('Category is required for manual transactions');
    }

    await this.assertCategoryMatchesTransaction(workspaceId, nextCategoryId, nextType);

    const transaction = await this.prisma.transaction.update({
      where: {
        id: transactionId,
      },
      data: {
        accountId: dto.accountId,
        categoryId: dto.categoryId,
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
      accountId: filters.accountId,
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

