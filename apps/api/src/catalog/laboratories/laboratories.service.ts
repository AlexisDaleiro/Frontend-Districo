import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { slugify } from '../../common/utils/slugify';
import { CreateLaboratoryDto } from './dto/create-laboratory.dto';
import { UpdateLaboratoryDto } from './dto/update-laboratory.dto';
import { LaboratoriesRepository } from './laboratories.repository';

@Injectable()
export class LaboratoriesService {
  findAdmin() { return this.laboratoriesRepository.findAdmin(); }
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

  async remove(id: string) {
    const laboratory = await this.laboratoriesRepository.findById(id);
    if (!laboratory || laboratory.deletedAt) throw new NotFoundException('Laboratorio no encontrado.');
    if (await this.laboratoriesRepository.hasActiveRules(id)) throw new ConflictException('El laboratorio está en una promoción o recomendación activa. Quitalo de esas reglas antes de eliminarlo.');
    if (await this.laboratoriesRepository.softDeleteIfUnused(id)) return { deleted: true };
    throw new ConflictException('El laboratorio tiene productos asociados. Reasignalos antes de eliminarlo.');
  }
}
