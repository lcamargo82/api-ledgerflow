import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryType, Prisma, type Category } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async list(userId: string, workspaceId: string, filters: ListCategoriesDto) {
    await this.workspacesService.assertCanRead(userId, workspaceId);

    return this.prisma.category.findMany({
      where: this.buildListWhere(workspaceId, filters),
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async create(userId: string, workspaceId: string, dto: CreateCategoryDto) {
    await this.workspacesService.assertCanWrite(userId, workspaceId);

    try {
      return await this.prisma.category.create({
        data: {
          workspaceId,
          name: dto.name,
          type: dto.type,
          color: dto.color ?? '#64748B',
          icon: dto.icon ?? 'tag',
          createdByUserId: userId,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error);
      throw error;
    }
  }

  async findOne(userId: string, workspaceId: string, categoryId: string) {
    await this.workspacesService.assertCanRead(userId, workspaceId);

    return this.findCategoryOrFail(workspaceId, categoryId);
  }

  async update(
    userId: string,
    workspaceId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ) {
    await this.workspacesService.assertCanWrite(userId, workspaceId);

    const category = await this.findCategoryOrFail(workspaceId, categoryId);
    this.assertCategoryCanBeChanged(category, dto);

    if (dto.type && dto.type !== category.type) {
      const transactionsCount = await this.prisma.transaction.count({
        where: {
          workspaceId,
          categoryId,
        },
      });

      if (transactionsCount > 0) {
        throw new BadRequestException('Cannot change type of a category with transactions');
      }
    }

    try {
      return await this.prisma.category.update({
        where: {
          id: categoryId,
        },
        data: {
          name: dto.name,
          type: dto.type,
          color: dto.color,
          icon: dto.icon,
          active: dto.active,
          updatedByUserId: userId,
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error);
      throw error;
    }
  }

  async remove(userId: string, workspaceId: string, categoryId: string) {
    await this.workspacesService.assertCanWrite(userId, workspaceId);

    const category = await this.findCategoryOrFail(workspaceId, categoryId);

    if (category.type === CategoryType.ADJUSTMENT) {
      throw new BadRequestException('System adjustment categories cannot be removed');
    }

    const transactionsCount = await this.prisma.transaction.count({
      where: {
        workspaceId,
        categoryId,
      },
    });

    if (transactionsCount > 0) {
      await this.prisma.category.update({
        where: {
          id: categoryId,
        },
        data: {
          active: false,
          updatedByUserId: userId,
        },
      });

      return {
        message: 'Category archived successfully',
      };
    }

    await this.prisma.category.delete({
      where: {
        id: categoryId,
      },
    });

    return {
      message: 'Category deleted successfully',
    };
  }

  private buildListWhere(workspaceId: string, filters: ListCategoriesDto): Prisma.CategoryWhereInput {
    return {
      workspaceId,
      active: filters.active ?? true,
      type: filters.type
        ? filters.type
        : filters.includeSystem
          ? undefined
          : {
              not: CategoryType.ADJUSTMENT,
            },
      ...(filters.search
        ? {
            name: {
              contains: filters.search,
              mode: 'insensitive',
            },
          }
        : {}),
    };
  }

  private async findCategoryOrFail(workspaceId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        workspaceId,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private assertCategoryCanBeChanged(category: Category, dto: UpdateCategoryDto) {
    if (category.type === CategoryType.ADJUSTMENT) {
      throw new BadRequestException('System adjustment categories cannot be changed');
    }

    if (category.isSystemDefault && dto.type && dto.type !== category.type) {
      throw new BadRequestException('System default category type cannot be changed');
    }
  }

  private handleKnownPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BadRequestException('Category already exists for this workspace and type');
    }
  }
}

