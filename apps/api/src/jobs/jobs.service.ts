import { Injectable, NotFoundException } from '@nestjs/common';
import { JobOpening, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobListQueryDto, SaveJobDto } from './dto/save-job.dto';

export const jobPublicWhere = (now = new Date()): Prisma.JobOpeningWhereInput => ({
  active: true, deletedAt: null,
  published: { lte: new Date(now.toLocaleDateString('en-CA', { timeZone: 'America/Montevideo' }) + 'T00:00:00Z') },
});

export const jobListWhere = (query: JobListQueryDto): Prisma.JobOpeningWhereInput => ({
  deletedAt: null,
  ...(query.status ? { active: query.status === 'active' } : {}),
  ...(query.search ? { OR: ['title', 'area', 'location'].map((field) => ({ [field]: { contains: query.search, mode: 'insensitive' } })) } : {}),
});

export const presentJob = ({ deletedAt: _deletedAt, createdAt: _createdAt, updatedAt: _updatedAt, ...job }: JobOpening) => ({
  ...job, published: job.published.toISOString().slice(0, 10),
});

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async publicList() {
    const jobs = await this.prisma.jobOpening.findMany({ where: jobPublicWhere(), orderBy: [{ published: 'desc' }, { id: 'asc' }] });
    return jobs.map(presentJob);
  }

  async adminList(query: JobListQueryDto) {
    const where = jobListWhere(query);
    const [jobs, total] = await this.prisma.$transaction([
      this.prisma.jobOpening.findMany({ where, orderBy: [{ published: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.jobOpening.count({ where }),
    ]);
    return { items: jobs.map(presentJob), meta: { total, page: query.page, limit: query.limit } };
  }

  async save(dto: SaveJobDto, userId: string, id?: string) {
    const data = { ...dto, published: new Date(dto.published + 'T00:00:00Z') };
    const job = await this.prisma.$transaction(async (tx) => {
      const previous = id ? await tx.jobOpening.findFirst({ where: { id, deletedAt: null } }) : null;
      if (id && !previous) throw new NotFoundException('Oferta laboral no encontrada.');
      const saved = id ? await tx.jobOpening.update({ where: { id, deletedAt: null }, data }) : await tx.jobOpening.create({ data });
      await tx.auditLog.create({ data: {
        userId, action: id ? 'JOB_OPENING_UPDATED' : 'JOB_OPENING_CREATED', entityType: 'JobOpening', entityId: saved.id,
        metadata: { previous: previous ? presentJob(previous) : null, current: presentJob(saved) },
      } });
      return saved;
    });
    return presentJob(job);
  }

  async remove(id: string, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      const previous = await tx.jobOpening.findFirst({ where: { id, deletedAt: null } });
      if (!previous) throw new NotFoundException('Oferta laboral no encontrada.');
      await tx.jobOpening.update({ where: { id, deletedAt: null }, data: { active: false, deletedAt: new Date() } });
      await tx.auditLog.create({ data: { userId, action: 'JOB_OPENING_DELETED', entityType: 'JobOpening', entityId: id, metadata: { previous: presentJob(previous) } } });
    });
    return { success: true };
  }
}
