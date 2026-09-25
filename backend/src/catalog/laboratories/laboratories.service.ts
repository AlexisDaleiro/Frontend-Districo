import { Injectable } from '@nestjs/common';
import { slugify } from '../../common/utils/slugify';
import { CreateLaboratoryDto } from './dto/create-laboratory.dto';
import { UpdateLaboratoryDto } from './dto/update-laboratory.dto';
import { LaboratoriesRepository } from './laboratories.repository';

@Injectable()
export class LaboratoriesService {
  constructor(private readonly laboratoriesRepository: LaboratoriesRepository) {}

  findAll() {
    return this.laboratoriesRepository.findAll();
  }

  create(dto: CreateLaboratoryDto) {
    return this.laboratoriesRepository.create({
      name: dto.name,
      slug: dto.slug ?? slugify(dto.name),
      active: dto.active ?? true,
    });
  }

  update(id: string, dto: UpdateLaboratoryDto) {
    return this.laboratoriesRepository.update(id, {
      ...dto,
      slug: dto.slug ?? (dto.name ? slugify(dto.name) : undefined),
    });
  }
}
