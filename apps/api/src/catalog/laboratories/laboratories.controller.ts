import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateLaboratoryDto } from './dto/create-laboratory.dto';
import { UpdateLaboratoryDto } from './dto/update-laboratory.dto';
import { LaboratoriesService } from './laboratories.service';
import { CatalogImagesService } from '../images/catalog-images.service';
import { MAX_BANNER_BYTES } from '../../banners/banner-storage.service';

@ApiTags('laboratories')
@Controller('laboratories')
export class LaboratoriesController {
  constructor(private readonly laboratoriesService: LaboratoriesService, private readonly images: CatalogImagesService) {}

  @Get()
  findAll() {
    return this.laboratoriesService.findAll();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  create(@Body() dto: CreateLaboratoryDto) {
    return this.laboratoriesService.create(dto);
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  findAdmin() { return this.laboratoriesService.findAdmin(); }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  update(@Param('id') id: string, @Body() dto: UpdateLaboratoryDto) {
    return this.laboratoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  remove(@Param('id') id: string) {
    return this.laboratoriesService.remove(id);
  }

  @Post(':id/logo')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BANNER_BYTES, files: 1 } }))
  uploadLogo(@Param('id') id: string, @UploadedFile() file: { buffer: Buffer; size: number; originalname: string } | undefined) {
    return this.images.uploadLogo('laboratories', id, file);
  }

  @Delete(':id/logo')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CATALOG)
  removeLogo(@Param('id') id: string) {
    return this.images.removeLogo('laboratories', id);
  }
}
