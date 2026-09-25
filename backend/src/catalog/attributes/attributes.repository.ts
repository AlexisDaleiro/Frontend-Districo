import { Injectable } from '@nestjs/common';
import { AttributeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AttributesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.attributeDefinition.findMany({
      where: { active: true },
      include: { values: { orderBy: { value: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  createDefinition(data: { name: string; slug: string; type: AttributeType }) {
    return this.prisma.attributeDefinition.create({ data });
  }

  createValue(attributeId: string, data: { value: string; slug: string }) {
    return this.prisma.attributeValue.create({ data: { attributeId, ...data } });
  }
}
