import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { slugify } from '../../common/utils/slugify';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandsRepository } from './brands.repository';
import { orderBrands } from './brand-order';

@Injectable()
export class BrandsService {
  constructor(private readonly brandsRepository: BrandsRepository) {}

  async findAll() {
    return orderBrands(await this.brandsRepository.findAll());
  }

  findAdmin() { return this.brandsRepository.findAdmin(); }

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

  async remove(id: string) {
    const brand = await this.brandsRepository.findById(id);
    if (!brand || brand.deletedAt) throw new NotFoundException('Marca no encontrada.');
    if (await this.brandsRepository.hasActiveRules(id)) throw new ConflictException('La marca está en una promoción o recomendación activa. Quitala de esas reglas antes de eliminarla.');
    if (await this.brandsRepository.softDeleteIfUnused(id)) return { deleted: true };
    throw new ConflictException('La marca tiene productos asociados. Reasignalos antes de eliminarla.');
  }
}
