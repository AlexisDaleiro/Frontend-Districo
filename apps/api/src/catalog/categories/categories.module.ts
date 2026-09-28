import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';
import { CategoryHierarchyService } from './category-hierarchy.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesRepository, CategoriesService, CategoryHierarchyService],
  exports: [CategoriesService, CategoryHierarchyService],
})
export class CategoriesModule {}
