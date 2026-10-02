import { Module } from '@nestjs/common';
import { BannersModule } from '../../banners/banners.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CatalogImagesService } from './catalog-images.service';

@Module({
  imports: [BannersModule, PrismaModule],
  providers: [CatalogImagesService],
  exports: [CatalogImagesService],
})
export class CatalogImagesModule {}
