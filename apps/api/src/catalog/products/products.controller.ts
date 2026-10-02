import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/types/jwt-user.type';
import { CreateProductMediaDto } from './dto/create-product-media.dto';
import { AdminProductFilterDto } from './dto/admin-product-filter.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { UpdateProductMediaDto } from './dto/update-product-media.dto';
import { ProductsService } from './products.service';
import { CatalogImagesService } from '../images/catalog-images.service';
import { MAX_BANNER_BYTES } from '../../banners/banner-storage.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService, private readonly images: CatalogImagesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findMany(@Query() filters: ProductFilterDto, @CurrentUser() user?: JwtUser | null) {
    return this.productsService.findMany(filters, user);
  }

  @Get('cards')
  @UseGuards(OptionalJwtAuthGuard)
  findCards(@Query() filters: ProductFilterDto, @CurrentUser() user?: JwtUser | null) {
    return this.productsService.findCards(filters, user);
  }

  @Get('admin/list')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  findAdminMany(@Query() filters: AdminProductFilterDto) {
    return this.productsService.findAdminMany(filters);
  }

  @Get('admin/:slug')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  findAdminBySlug(@Param('slug') slug: string) {
    return this.productsService.findAdminBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Post(':id/variants')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  createVariant(@Param('id') id: string, @Body() dto: CreateVariantDto) {
    return this.productsService.createVariant(id, dto);
  }

  @Patch('variants/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  updateVariant(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.productsService.updateVariant(id, dto);
  }

  @Post(':id/media')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  createMedia(@Param('id') id: string, @Body() dto: CreateProductMediaDto) {
    return this.productsService.createMedia(id, dto);
  }

  @Post(':id/media/upload')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  @UseInterceptors(FilesInterceptor('files', 8, { limits: { fileSize: MAX_BANNER_BYTES, files: 8 } }))
  uploadMedia(@Param('id') id: string, @UploadedFiles() files: { buffer: Buffer; size: number; originalname: string }[] | undefined) {
    return this.images.uploadProductImages(id, files);
  }

  @Patch('media/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  updateMedia(@Param('id') id: string, @Body() dto: UpdateProductMediaDto) {
    return this.productsService.updateMedia(id, dto);
  }

  @Delete('media/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  deleteMedia(@Param('id') id: string) {
    return this.productsService.deleteMedia(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  findBySlug(@Param('slug') slug: string, @CurrentUser() user?: JwtUser | null) {
    return this.productsService.findBySlug(slug, user);
  }
}
