import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CvStorageService } from "../jobs/cv-storage.service";
import { NotificationsService } from "../notifications/notifications.service";
import { JwtUser } from "../common/types/jwt-user.type";
import { CandidateActivityDto, OperationsQueryDto } from "./dto/operations.dto";

@Injectable()
export class RecruitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: CvStorageService,
    private readonly notifications: NotificationsService,
  ) {}
  private async candidate(id: string) {
    const candidate = await this.prisma.jobApplication.findUnique({
      where: { id },
    });
    if (!candidate) throw new NotFoundException("Candidato no encontrado.");
    return candidate;
  }
  async activities(id: string) {
    const candidate = await this.candidate(id);
    return {
      cvDeletedAt: candidate.cvDeletedAt,
      cvDeleteAfter: candidate.cvDeleteAfter,
      cvRetentionMonths: candidate.cvRetentionMonths,
      items: await this.prisma.candidateActivity.findMany({
        where: { candidateId: id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 100,
      }),
    };
  }
  async interviews(query: OperationsQueryDto) {
    const from = query.dateFrom
      ? new Date(`${query.dateFrom.slice(0, 10)}T00:00:00-03:00`)
      : new Date();
    const to = query.dateTo
      ? new Date(
          new Date(`${query.dateTo.slice(0, 10)}T00:00:00-03:00`).getTime() +
            86400000,
        )
      : new Date(from.getTime() + 90 * 86400000);
    if (
      !Number.isFinite(from.getTime()) ||
      !Number.isFinite(to.getTime()) ||
      from >= to ||
      to.getTime() - from.getTime() > 90 * 86400000
    )
      throw new BadRequestException(
        "Elegí un rango de hasta 90 días para la agenda.",
      );
    const term = query.search?.trim();
    const where: Prisma.CandidateActivityWhereInput = {
      kind: "INTERVIEW",
      scheduledAt: { gte: from, lt: to },
      ...(term
        ? {
            candidate: {
              OR: [
                { name: { contains: term, mode: "insensitive" } },
                { job: { title: { contains: term, mode: "insensitive" } } },
              ],
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.candidateActivity.findMany({
        where,
        select: {
          id: true,
          scheduledAt: true,
          body: true,
          candidate: {
            select: {
              id: true,
              name: true,
              status: true,
              job: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.candidateActivity.count({ where }),
    ]);
    return { items, meta: { total, page: query.page, limit: query.limit } };
  }
  async add(id: string, dto: CandidateActivityDto, user: JwtUser) {
    const candidate = await this.candidate(id);
    if (!dto.body.trim())
      throw new BadRequestException("Completá la actividad.");
    if (dto.kind === "INTERVIEW" && !dto.scheduledAt)
      throw new BadRequestException("Indicá la fecha de entrevista.");
    if (dto.sendEmail && dto.kind !== "EMAIL")
      throw new BadRequestException(
        "Elegí comunicación para enviar un correo.",
      );
    if (dto.sendEmail && !this.notifications.settings().ready)
      throw new ServiceUnavailableException(
        "Correo no configurado. Guardá un borrador.",
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "JobApplication" WHERE "id" = ${id} FOR UPDATE`;
      const previous = await tx.candidateActivity.findUnique({
        where: { id: dto.requestId },
      });
      if (previous) {
        if (
          previous.candidateId !== id ||
          previous.body !== dto.body.trim() ||
          previous.kind !== dto.kind ||
          (previous.scheduledAt?.toISOString() ?? null) !==
            (dto.scheduledAt
              ? new Date(dto.scheduledAt).toISOString()
              : null) ||
          !!previous.notificationId !== !!dto.sendEmail
        )
          throw new ConflictException("La operación ya fue utilizada.");
        return previous;
      }
      const notification = dto.sendEmail
        ? await this.notifications.enqueue(
            "candidate.communication",
            candidate.email,
            { subject: "DISTRICO: tu postulación", text: dto.body.trim() },
            { candidateId: id },
            tx,
          )
        : undefined;
      const activity = await tx.candidateActivity.create({
        data: {
          id: dto.requestId,
          candidateId: id,
          kind: dto.kind,
          body: dto.body.trim(),
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          recordedById: user.sub,
          notificationId: notification?.id,
        },
      });
      const current = await tx.jobApplication.findUniqueOrThrow({
        where: { id },
      });
      const after =
        current.cvRetentionMonths && !current.cvDeletedAt ? new Date() : null;
      if (after)
        after.setUTCMonth(after.getUTCMonth() + current.cvRetentionMonths);
      await tx.jobApplication.update({
        where: { id },
        data: {
          updatedAt: new Date(),
          ...(after ? { cvDeleteAfter: after } : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.sub,
          action: "CANDIDATE_ACTIVITY_CREATED",
          entityType: "JobApplication",
          entityId: id,
          metadata: { kind: dto.kind, emailQueued: !!notification },
        },
      });
      return activity;
    });
  }
  async retention(id: string, months: number, user: JwtUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "JobApplication" WHERE "id" = ${id} FOR UPDATE`;
      const candidate = await tx.jobApplication.findUnique({ where: { id } });
      if (!candidate) throw new NotFoundException("Candidato no encontrado.");
      if (candidate.cvDeletedAt)
        throw new BadRequestException("El CV ya fue eliminado.");
      const after = months ? new Date(candidate.updatedAt) : null;
      if (after) after.setUTCMonth(after.getUTCMonth() + months);
      await tx.jobApplication.update({
        where: { id },
        data: { cvDeleteAfter: after, cvRetentionMonths: months },
      });
      await tx.auditLog.create({
        data: {
          userId: user.sub,
          action: "CANDIDATE_CV_RETENTION_SET",
          entityType: "JobApplication",
          entityId: id,
          metadata: { months, deleteAfter: after?.toISOString() ?? null },
        },
      });
      return { cvDeleteAfter: after };
    });
  }
  async cleanup(user: JwtUser) {
    if (user.role !== Role.ADMIN)
      throw new ForbiddenException(
        "Sólo administración puede ejecutar la eliminación de CV vencidos.",
      );
    const candidates = await this.prisma.jobApplication.findMany({
      where: { cvDeletedAt: null, cvDeleteAfter: { lte: new Date() } },
      select: { id: true },
      orderBy: { cvDeleteAfter: "asc" },
      take: 10,
    });
    let removed = 0;
    for (const { id } of candidates)
      await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "JobApplication" WHERE "id" = ${id} FOR UPDATE`;
          const candidate = await tx.jobApplication.findUniqueOrThrow({
            where: { id },
          });
          if (
            candidate.cvDeletedAt ||
            !candidate.cvDeleteAfter ||
            candidate.cvDeleteAfter > new Date()
          )
            return;
          await this.storage.removeConfirmed(candidate.cvPath);
          await tx.jobApplication.update({
            where: { id },
            data: {
              cvDeletedAt: new Date(),
              cvPath: "",
              cvFilename: "CV eliminado",
              cvSize: 0,
            },
          });
          await tx.auditLog.create({
            data: {
              userId:
                user.sub === "scheduled-maintenance" ? undefined : user.sub,
              action: "CANDIDATE_EXPIRED_CV_DELETED",
              entityType: "JobApplication",
              entityId: id,
              metadata: {
                source:
                  user.sub === "scheduled-maintenance" ? "SCHEDULER" : "ADMIN",
              },
            },
          });
          removed++;
        },
        { timeout: 20000 },
      );
    return { removed, moreMayRemain: candidates.length === 10 };
  }
}
