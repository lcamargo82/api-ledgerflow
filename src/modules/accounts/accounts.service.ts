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

  async getDashboardSummary(userId: string, workspaceId: string) {
    const accounts = await this.list(userId, workspaceId);
    const totalIncluded = accounts.reduce((total, account) => {
      if (!account.includeInTotal) return total;
      return total.plus(account.balance);
    }, new Prisma.Decimal(0));
    const totalOverall = accounts.reduce(
      (total, account) => total.plus(account.balance),
      new Prisma.Decimal(0),
    );

    return {
      workspaceId,
      totalIncluded: this.formatDecimal(totalIncluded),
      totalOverall: this.formatDecimal(totalOverall),
      accounts,
    };
  }

  private async getBalances(workspaceId: string, accountIds?: string[]) {
    const groupedTransactions = await this.prisma.transaction.groupBy({
      by: ['accountId', 'type'],
      where: {
        workspaceId,
        ...(accountIds
          ? {
              accountId: {
                in: accountIds,
              },
            }
          : {}),
      },
      _sum: {
        amount: true,
      },
    });

    const balances = new Map<string, Prisma.Decimal>();

    for (const group of groupedTransactions) {
      const amount = group._sum.amount ?? new Prisma.Decimal(0);
      const currentBalance = balances.get(group.accountId) ?? new Prisma.Decimal(0);
      const nextBalance =
        group.type === TransactionType.EXPENSE
          ? currentBalance.minus(amount)
          : currentBalance.plus(amount);

      balances.set(group.accountId, nextBalance);
    }

    return balances;
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
