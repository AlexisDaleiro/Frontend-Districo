import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';
import { CategoriesModule } from '../categories/categories.module';
import { CatalogImagesModule } from '../images/catalog-images.module';

@Module({
  imports: [CategoriesModule, CatalogImagesModule],
  controllers: [ProductsController],
  providers: [ProductsRepository, ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
