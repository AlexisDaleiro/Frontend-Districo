import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { CatalogImagesService } from '../images/catalog-images.service';
import { MAX_BANNER_BYTES } from '../../banners/banner-storage.service';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService, private readonly images: CatalogImagesService) {}

  @Get()
  findAll() {
    return this.brandsService.findAll();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }

  @Post(':id/logo')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BANNER_BYTES, files: 1 } }))
  uploadLogo(@Param('id') id: string, @UploadedFile() file: { buffer: Buffer; size: number; originalname: string } | undefined) {
    return this.images.uploadLogo('brands', id, file);
  }

  @Delete(':id/logo')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  removeLogo(@Param('id') id: string) {
    return this.images.removeLogo('brands', id);
  }
}
