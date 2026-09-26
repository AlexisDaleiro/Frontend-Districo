import { Injectable } from '@nestjs/common';
import { AttributeType } from '@prisma/client';
import { slugify } from '../../common/utils/slugify';
import { AttributesRepository } from './attributes.repository';
import { CreateAttributeDefinitionDto } from './dto/create-attribute-definition.dto';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';

@Injectable()
export class AttributesService {
  constructor(private readonly attributesRepository: AttributesRepository) {}

  findAll() {
    return this.attributesRepository.findAll();
  }

  createDefinition(dto: CreateAttributeDefinitionDto) {
    return this.attributesRepository.createDefinition({
      name: dto.name,
      slug: dto.slug ?? slugify(dto.name),
      type: dto.type ?? AttributeType.SELECT,
    });
  }

  createValue(attributeId: string, dto: CreateAttributeValueDto) {
    return this.attributesRepository.createValue(attributeId, {
      value: dto.value,
      slug: dto.slug ?? slugify(dto.value),
    });
  }
}
