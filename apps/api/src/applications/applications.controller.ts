import { Body, Controller, Get, Param, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { ApplicationsService, type PermitFile } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';

@ApiTags('applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('documents', 3, { limits: { fileSize: 5_000_000, files: 3 } }))
  create(@Body() dto: CreateApplicationDto, @UploadedFiles() files: PermitFile[] = []) {
    return this.applicationsService.create(dto, files);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findMany() {
    return this.applicationsService.findMany();
  }

  @Post(':id/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  approve(@Param('id') id: string, @Body() dto: ReviewApplicationDto, @CurrentUser() user: JwtUser) {
    return this.applicationsService.approve(id, user.sub, dto.medicationPermission ?? false);
  }

  @Post(':id/reject')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  reject(@Param('id') id: string, @Body() dto: ReviewApplicationDto, @CurrentUser() user: JwtUser) {
    return this.applicationsService.reject(id, user.sub, dto.rejectionReason);
  }
}
