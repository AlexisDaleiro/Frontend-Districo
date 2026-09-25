import { Module } from '@nestjs/common';
import { LaboratoriesController } from './laboratories.controller';
import { LaboratoriesRepository } from './laboratories.repository';
import { LaboratoriesService } from './laboratories.service';

@Module({
  controllers: [LaboratoriesController],
  providers: [LaboratoriesRepository, LaboratoriesService],
  exports: [LaboratoriesService],
})
export class LaboratoriesModule {}
