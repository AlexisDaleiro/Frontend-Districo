import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { JobListQueryDto, SaveJobDto } from './dto/save-job.dto';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list() { return this.jobs.publicList(); }
}

@ApiTags('admin-jobs')
@ApiBearerAuth()
@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminJobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(@Query() query: JobListQueryDto) { return this.jobs.adminList(query); }

  @Post()
  create(@Body() dto: SaveJobDto, @CurrentUser() user: JwtUser) { return this.jobs.save(dto, user.sub); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: SaveJobDto, @CurrentUser() user: JwtUser) { return this.jobs.save(dto, user.sub, id); }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) { return this.jobs.remove(id, user.sub); }
}
