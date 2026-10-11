import { Module } from '@nestjs/common';
import { AdminJobsController, JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobApplicationsService } from './job-applications.service';
import { CvStorageService } from './cv-storage.service';

@Module({ controllers: [JobsController, AdminJobsController], providers: [JobsService, JobApplicationsService, CvStorageService] })
export class JobsModule {}
