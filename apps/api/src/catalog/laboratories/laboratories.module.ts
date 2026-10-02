import { Module } from '@nestjs/common';
import { LaboratoriesController } from './laboratories.controller';
import { LaboratoriesRepository } from './laboratories.repository';
import { LaboratoriesService } from './laboratories.service';
import { CatalogImagesModule } from '../images/catalog-images.module';

@Module({
  imports: [CatalogImagesModule],
  controllers: [LaboratoriesController],
  providers: [LaboratoriesRepository, LaboratoriesService],
  exports: [LaboratoriesService],
})
export class LaboratoriesModule {}
