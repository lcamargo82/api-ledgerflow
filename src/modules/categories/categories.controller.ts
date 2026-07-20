import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista categorias do workspace' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiQuery({ name: 'type', required: false, enum: ['INCOME', 'EXPENSE', 'ADJUSTMENT'] })
  @ApiQuery({ name: 'active', required: false, example: true })
  @ApiQuery({ name: 'includeSystem', required: false, example: false })
  @ApiQuery({ name: 'search', required: false, example: 'alimentacao' })
  @ApiNotFoundResponse({ description: 'Workspace nao encontrado ou inacessivel' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 'category-id',
          workspaceId: 'workspace-id',
          name: 'Alimentacao',
          type: 'EXPENSE',
          color: '#EF4444',
          icon: 'utensils',
          isSystemDefault: false,
          active: true,
        },
      ],
    },
  })
  list(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Query() filters: ListCategoriesDto,
  ) {
    return this.categoriesService.list(request.user.sub, workspaceId, filters);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma categoria de receita ou despesa' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiBadRequestResponse({ description: 'Payload invalido ou categoria duplicada' })
  @ApiNotFoundResponse({ description: 'Workspace nao encontrado ou sem permissao de escrita' })
  @ApiCreatedResponse({
    schema: {
      example: {
        id: 'category-id',
        workspaceId: 'workspace-id',
        name: 'Alimentacao',
        type: 'EXPENSE',
        color: '#EF4444',
        icon: 'utensils',
        isSystemDefault: false,
        active: true,
      },
    },
  })
  create(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(request.user.sub, workspaceId, dto);
  }

  @Get(':categoryId')
  @ApiOperation({ summary: 'Detalha uma categoria do workspace' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiParam({ name: 'categoryId', example: 'category-id' })
  @ApiNotFoundResponse({ description: 'Workspace ou categoria nao encontrados' })
  findOne(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoriesService.findOne(request.user.sub, workspaceId, categoryId);
  }

  @Patch(':categoryId')
  @ApiOperation({ summary: 'Atualiza uma categoria' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiParam({ name: 'categoryId', example: 'category-id' })
  @ApiBadRequestResponse({ description: 'Payload invalido, categoria duplicada ou protegida' })
  @ApiNotFoundResponse({ description: 'Workspace ou categoria nao encontrados' })
  update(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(request.user.sub, workspaceId, categoryId, dto);
  }

  @Delete(':categoryId')
  @ApiOperation({ summary: 'Remove ou arquiva uma categoria sem quebrar historico' })
  @ApiParam({ name: 'workspaceId', example: 'workspace-id' })
  @ApiParam({ name: 'categoryId', example: 'category-id' })
  @ApiBadRequestResponse({ description: 'Categoria sistemica nao pode ser removida' })
  @ApiNotFoundResponse({ description: 'Workspace ou categoria nao encontrados' })
  @ApiOkResponse({
    schema: {
      examples: {
        archived: {
          value: {
            message: 'Category archived successfully',
          },
        },
        deleted: {
          value: {
            message: 'Category deleted successfully',
          },
        },
      },
    },
  })
  remove(
    @Request() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoriesService.remove(request.user.sub, workspaceId, categoryId);
  }
}

