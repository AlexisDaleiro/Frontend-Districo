import { Module } from '@nestjs/common';
import { AdminJobsController, JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({ controllers: [JobsController, AdminJobsController], providers: [JobsService] })
export class JobsModule {}
