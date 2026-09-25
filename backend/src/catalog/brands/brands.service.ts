import { Injectable } from '@nestjs/common';
import { slugify } from '../../common/utils/slugify';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandsRepository } from './brands.repository';

@Injectable()
export class BrandsService {
  constructor(private readonly brandsRepository: BrandsRepository) {}

  findAll() {
    return this.brandsRepository.findAll();
  }

  create(dto: CreateBrandDto) {
    return this.brandsRepository.create({
      name: dto.name,
      slug: dto.slug ?? slugify(dto.name),
      active: dto.active ?? true,
    });
  }

  update(id: string, dto: UpdateBrandDto) {
    return this.brandsRepository.update(id, {
      ...dto,
      slug: dto.slug ?? (dto.name ? slugify(dto.name) : undefined),
    });
  }
}
