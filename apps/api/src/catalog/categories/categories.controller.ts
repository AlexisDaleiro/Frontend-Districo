import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryProductsQueryDto } from './dto/category-products-query.dto';
import { LinkCategoryProductDto } from './dto/link-category-product.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findTree() {
    return this.categoriesService.findTree();
  }

  @Get('catalog')
  findCatalogTree() {
    return this.categoriesService.findCatalogTree();
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  findAdmin() {
    return this.categoriesService.findAdmin();
  }

  @Get('admin/:id/products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  products(@Param('id') id: string, @Query() query: CategoryProductsQueryDto) {
    return this.categoriesService.products(id, query);
  }

  @Get('admin/:id/candidates')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  candidates(@Param('id') id: string, @Query() query: CategoryProductsQueryDto) {
    return this.categoriesService.products(id, query, false);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Post(':id/products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  linkProduct(@Param('id') id: string, @Body() dto: LinkCategoryProductDto) {
    return this.categoriesService.linkProduct(id, dto.productId);
  }

  @Delete(':id/products/:productId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  unlinkProduct(@Param('id') id: string, @Param('productId') productId: string) {
    return this.categoriesService.unlinkProduct(id, productId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }
}
