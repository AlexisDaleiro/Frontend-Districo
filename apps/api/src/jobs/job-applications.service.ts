import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JobApplication, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFObject } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyJobDto, CandidateQueryDto, UpdateCandidateDto } from './dto/job-application.dto';
import { CvStorageService } from './cv-storage.service';
import { jobPublicWhere } from './jobs.service';

export const presentCandidate = ({ cvPath: _path, submissionId: _submission, ...candidate }: Omit<JobApplication, 'cvDeletedAt' | 'cvDeleteAfter' | 'cvRetentionMonths'> & Partial<Pick<JobApplication, 'cvDeletedAt' | 'cvDeleteAfter' | 'cvRetentionMonths'>>) => candidate;
const legacySelect = { id: true, jobId: true, submissionId: true, name: true, email: true, phone: true, message: true, status: true, cvPath: true, cvFilename: true, cvSize: true, consentAt: true, createdAt: true, updatedAt: true } as const satisfies Prisma.JobApplicationSelect;

export async function validateCv(file?: { buffer: Buffer; mimetype: string; originalname: string; size: number }) {
  if (!file || !file.size || file.size > 5 * 1024 * 1024 || file.mimetype !== 'application/pdf' || file.buffer.subarray(0, 5).toString() !== '%PDF-') throw new BadRequestException('Adjuntá un CV en PDF de hasta 5 MB.');
  try {
    const pdf = await PDFDocument.load(file.buffer);
    if (!pdf.getPageCount() || pdf.getPageCount() > 50) throw new Error('pages');
    const visited = new Set<PDFObject>();
    const inspect = (object: PDFObject, depth = 0) => {
      if (visited.has(object)) return;
      if (depth > 100 || visited.size > 100000) throw new Error('complex');
      visited.add(object);
      if (object instanceof PDFDict) {
        if (object.keys().some((key) => ['/JS', '/JavaScript', '/OpenAction', '/AA', '/EmbeddedFiles', '/EF', '/XFA', '/RichMediaContent'].includes(key.toString())) || ['/JavaScript', '/Launch'].includes(object.get(PDFName.of('S'))?.toString() ?? '')) throw new Error('active');
        for (const [, value] of object.entries()) inspect(value, depth + 1);
      } else if (object instanceof PDFArray) for (const value of object.asArray()) inspect(value, depth + 1);
    };
    for (const [, object] of pdf.context.enumerateIndirectObjects()) inspect(object);
  } catch { throw new BadRequestException('El CV debe ser un PDF válido, sin contraseña, scripts ni adjuntos.'); }
  const name = file.originalname.replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\.[^.]*$/, '').slice(0, 116) || 'cv';
  return { ...file, originalname: `${name}.pdf` };
}

@Injectable()
export class JobApplicationsService {
  constructor(private readonly prisma: PrismaService, private readonly storage: CvStorageService) {}

  private async select() {
    const ready = !!await this.prisma.operationalSchemaReady?.();
    return { ...legacySelect, cvDeletedAt: ready, cvDeleteAfter: ready, cvRetentionMonths: ready };
  }

  async apply(jobId: string, dto: ApplyJobDto, input?: Parameters<typeof validateCv>[0]) {
    const file = await validateCv(input);
    const job = await this.prisma.jobOpening.findFirst({ where: { id: jobId, ...jobPublicWhere(), isExample: false } });
    if (!job) throw new NotFoundException('Esta oferta no recibe postulaciones.');
    const existing = await this.prisma.jobApplication.findFirst({ where: { jobId, OR: [{ email: dto.email }, { submissionId: dto.submissionId }] }, select: { id: true } });
    if (existing) return { success: true };
    const path = `${jobId}/${randomUUID()}.pdf`;
    await this.storage.upload(path, file.buffer);
    try {
      await this.prisma.$transaction(async (tx) => {
        if (!await tx.jobOpening.findFirst({ where: { id: jobId, ...jobPublicWhere(), isExample: false } })) throw new NotFoundException('Esta oferta ya no recibe postulaciones.');
        const candidate = await tx.jobApplication.create({ data: {
          jobId, submissionId: dto.submissionId, name: dto.name, email: dto.email, phone: dto.phone,
          message: dto.message, consentAt: new Date(), cvPath: path, cvFilename: file.originalname, cvSize: file.size,
        }, select: { id: true } });
        await tx.auditLog.create({ data: { action: 'JOB_APPLICATION_RECEIVED', entityType: 'JobApplication', entityId: candidate.id, metadata: { jobId } } });
      });
    } catch (error) {
      await this.storage.remove(path);
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    }
    return { success: true };
  }

  async list(jobId: string, query: CandidateQueryDto) {
    if (!await this.prisma.jobOpening.findUnique({ where: { id: jobId } })) throw new NotFoundException('Oferta no encontrada.');
    const where: Prisma.JobApplicationWhereInput = { jobId,
      ...(query.candidateStatus ? { status: query.candidateStatus } : {}),
      ...(query.search ? { OR: ['name', 'email', 'phone'].map((key) => ({ [key]: { contains: query.search, mode: 'insensitive' } })) } : {}),
    };
    const select = await this.select();
    const [items, total] = await this.prisma.$transaction([
      this.prisma.jobApplication.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit, select }),
      this.prisma.jobApplication.count({ where }),
    ]);
    return { items: items.map(presentCandidate), meta: { total, page: query.page, limit: query.limit } };
  }

  async update(jobId: string, id: string, dto: UpdateCandidateDto, userId: string) {
    const select = await this.select();
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.jobApplication.findFirst({ where: { id, jobId }, select });
      if (!previous) throw new NotFoundException('Candidato no encontrado.');
      const after = previous.cvRetentionMonths && !previous.cvDeletedAt ? new Date() : null;
      if (after) after.setUTCMonth(after.getUTCMonth() + previous.cvRetentionMonths);
      const candidate = await tx.jobApplication.update({ where: { id }, data: { ...dto, ...(after ? { cvDeleteAfter: after } : {}) }, select });
      await tx.auditLog.create({ data: { userId, action: 'JOB_APPLICATION_STATUS_CHANGED', entityType: 'JobApplication', entityId: id, metadata: { jobId, previous: previous.status, current: dto.status } } });
      return presentCandidate(candidate);
    });
  }

  async download(jobId: string, id: string, userId: string) {
    const candidate = await this.prisma.jobApplication.findFirst({ where: { id, jobId }, select: await this.select() });
    if (!candidate) throw new NotFoundException('Candidato no encontrado.');
    if (candidate.cvDeletedAt) throw new NotFoundException('El CV fue eliminado por su plazo de conservación.');
    const bytes = await this.storage.download(candidate.cvPath);
    await this.prisma.auditLog.create({ data: { userId, action: 'JOB_CV_DOWNLOADED', entityType: 'JobApplication', entityId: id, metadata: { jobId } } });
    return { bytes, filename: candidate.cvFilename };
  }
}
