import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { JobListQueryDto, SaveJobDto } from './dto/save-job.dto';
import { JobsService } from './jobs.service';
import { JobApplicationsService } from './job-applications.service';
import { ApplyJobDto, CandidateQueryDto, UpdateCandidateDto } from './dto/job-application.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService, private readonly candidates: JobApplicationsService) {}

  @Get()
  list() { return this.jobs.publicList(); }

  @Get(':id')
  detail(@Param('id') id: string) { return this.jobs.detail(id, true); }

  @Post(':id/applications')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('cv', { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 6, fieldSize: 3000 } }))
  apply(@Param('id') id: string, @Body() dto: ApplyJobDto, @UploadedFile() file: Parameters<typeof this.candidates.apply>[2]) { return this.candidates.apply(id, dto, file); }
}

@ApiTags('admin-jobs')
@ApiBearerAuth()
@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminJobsController {
  constructor(private readonly jobs: JobsService, private readonly candidates: JobApplicationsService) {}

  @Get()
  list(@Query() query: JobListQueryDto) { return this.jobs.adminList(query); }

  @Get(':id')
  detail(@Param('id') id: string) { return this.jobs.detail(id); }

  @Get(':id/applications')
  applications(@Param('id') id: string, @Query() query: CandidateQueryDto) { return this.candidates.list(id, query); }

  @Patch(':id/applications/:candidateId')
  updateCandidate(@Param('id') id: string, @Param('candidateId') candidateId: string, @Body() dto: UpdateCandidateDto, @CurrentUser() user: JwtUser) { return this.candidates.update(id, candidateId, dto, user.sub); }

  @Get(':id/applications/:candidateId/cv')
  async download(@Param('id') id: string, @Param('candidateId') candidateId: string, @CurrentUser() user: JwtUser, @Res() res: Response) {
    const file = await this.candidates.download(id, candidateId, user.sub);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${file.filename.replace(/["\\\r\n]/g, '_')}"`, 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' }).send(file.bytes);
  }

  @Post()
  create(@Body() dto: SaveJobDto, @CurrentUser() user: JwtUser) { return this.jobs.save(dto, user.sub); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: SaveJobDto, @CurrentUser() user: JwtUser) { return this.jobs.save(dto, user.sub, id); }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) { return this.jobs.remove(id, user.sub); }
}
