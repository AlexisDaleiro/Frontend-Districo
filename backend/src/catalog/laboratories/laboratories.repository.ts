import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LaboratoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.laboratory.findMany({ where: { deletedAt: null, active: true }, orderBy: { name: 'asc' } });
  }

  create(data: Prisma.LaboratoryCreateInput) {
    return this.prisma.laboratory.create({ data });
  }

  update(id: string, data: Prisma.LaboratoryUpdateInput) {
    return this.prisma.laboratory.update({ where: { id }, data });
  }
}
