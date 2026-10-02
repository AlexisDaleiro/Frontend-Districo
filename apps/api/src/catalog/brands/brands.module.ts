import { Module } from '@nestjs/common';
import { BrandsController } from './brands.controller';
import { BrandsRepository } from './brands.repository';
import { BrandsService } from './brands.service';
import { CatalogImagesModule } from '../images/catalog-images.module';

@Module({
  imports: [CatalogImagesModule],
  controllers: [BrandsController],
  providers: [BrandsRepository, BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
