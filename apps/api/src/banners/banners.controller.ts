import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { MAX_BANNER_BYTES } from './banner-storage.service';
import { BannerFiles, BannersService } from './banners.service';
import { SaveBannerDto } from './dto/save-banner.dto';

@ApiTags('banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly banners: BannersService) {}

  @Get()
  list() { return this.banners.publicList(); }
}

@ApiTags('admin-banners')
@ApiBearerAuth()
@Controller('admin/banners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.CATALOG)
export class AdminBannersController {
  constructor(private readonly banners: BannersService) {}

  @Get()
  list() { return this.banners.adminList(); }

  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'desktop', maxCount: 1 }, { name: 'mobile', maxCount: 1 }], { limits: { fileSize: MAX_BANNER_BYTES, files: 2 } }))
  create(@Body() dto: SaveBannerDto, @UploadedFiles() files: BannerFiles, @CurrentUser() user: JwtUser) {
    return this.banners.create(dto, files ?? {}, user.sub);
  }

  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'desktop', maxCount: 1 }, { name: 'mobile', maxCount: 1 }], { limits: { fileSize: MAX_BANNER_BYTES, files: 2 } }))
  update(@Param('id') id: string, @Body() dto: SaveBannerDto, @UploadedFiles() files: BannerFiles, @CurrentUser() user: JwtUser) {
    return this.banners.update(id, dto, files ?? {}, user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.banners.remove(id, user.sub);
  }
}
