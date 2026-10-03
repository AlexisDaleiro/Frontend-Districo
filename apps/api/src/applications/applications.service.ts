import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CustomerApplicationStatus, Permission, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationListQueryDto } from '../admin/dto/application-list-query.dto';
import { InvoiceStorageService } from '../orders/invoice-storage.service';

export function permitFileType(bytes: Buffer) {
  if (bytes.subarray(0, 5).toString() === '%PDF-') return { mimeType: 'application/pdf', extension: 'pdf' };
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mimeType: 'image/png', extension: 'png' };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { mimeType: 'image/jpeg', extension: 'jpg' };
  throw new BadRequestException('Adjuntá archivos PDF, PNG o JPG válidos.');
}
export type PermitFile = { buffer: Buffer; size: number; originalname: string; mimetype: string };

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly storage: InvoiceStorageService,
  ) {}

  async create(dto: CreateApplicationDto, files: PermitFile[] = []) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingUser) {
      throw new BadRequestException('Ya existe un usuario con ese email.');
    }

    if (files.length > 3) throw new BadRequestException('Podés adjuntar hasta 3 archivos.');
    const documents = files.map((file) => {
      if (!file.buffer?.length || file.size > 5_000_000) throw new BadRequestException('Cada archivo debe pesar menos de 5 MB.');
      const kind = permitFileType(file.buffer);
      if (file.mimetype !== kind.mimeType && !(kind.mimeType === 'image/jpeg' && file.mimetype === 'image/jpg'))
        throw new BadRequestException('El formato del archivo no coincide con su contenido.');
      return { ...kind, originalName: file.originalname.slice(0, 200), bytes: file.buffer };
    });
    const id = randomUUID();
    const paths: string[] = [];
    let application: { id: string; email: string; status: CustomerApplicationStatus };
    try {
      for (const [index, document] of documents.entries()) {
        const path = `applications/${id}/${index}-${randomUUID()}.${document.extension}`;
        await this.storage.upload(path, document.bytes, document.mimeType);
        paths.push(path);
      }

      application = await this.prisma.customerApplication.create({
      data: {
        id,
        businessName: dto.businessName,
        legalName: dto.legalName,
        rut: dto.rut,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 10),
        address: dto.address,
        department: dto.department,
        city: dto.city,
        businessType: dto.businessType,
        requestedMedicationPermission: dto.requestedMedicationPermission ?? false,
        documents: documents.length
          ? {
              create: documents.map((document, index) => ({
                type: 'BUSINESS_PERMIT',
                fileUrl: paths[index],
                originalName: document.originalName,
                mimeType: document.mimeType,
              })),
            }
          : undefined,
      },
      select: { id: true, email: true, status: true },
    });

    } catch (error) {
      await Promise.all(paths.map((path) => this.storage.remove(path)));
      throw error;
    }
    await this.notifications.notify('registration.received', application.email, { applicationId: application.id });
    return application;
  }

  async document(applicationId: string, documentId: string) {
    const document = await this.prisma.customerDocument.findFirst({ where: { id: documentId, applicationId } });
    if (!document || !document.fileUrl.startsWith(`applications/${applicationId}/`))
      throw new NotFoundException('Documento no encontrado.');
    return { bytes: await this.storage.download(document.fileUrl), mimeType: document.mimeType, name: document.originalName };
  }

  findMany() {
    return this.prisma.customerApplication.findMany({
      orderBy: { createdAt: 'desc' },
      include: { documents: true },
    });
  }

  async findPage(query: ApplicationListQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.CustomerApplicationWhereInput = {
      status: query.status,
      OR: search ? [
        { businessName: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
        { rut: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
      ] : undefined,
    };
    const [items, total] = await Promise.all([
      this.prisma.customerApplication.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: { id: true, businessName: true, legalName: true, rut: true, email: true, contactName: true, phone: true, address: true, city: true, department: true, businessType: true, requestedMedicationPermission: true, status: true, rejectionReason: true, createdAt: true, documents: { select: { id: true, type: true, originalName: true } } },
      }),
      this.prisma.customerApplication.count({ where }),
    ]);
    return { items, meta: { total, page: query.page, limit: query.limit } };
  }

  async approve(id: string, reviewedById: string, medicationPermission = false) {
    const application = await this.prisma.customerApplication.findUnique({ where: { id }, include: { documents: true } });
    if (!application) {
      throw new NotFoundException('Solicitud no encontrada.');
    }
    if (application.status !== CustomerApplicationStatus.PENDING) {
      throw new BadRequestException('La solicitud ya fue revisada.');
    }

    const permissions: Permission[] = [Permission.CAN_VIEW_PRICES, Permission.CAN_PLACE_ORDERS];
    if (medicationPermission) permissions.push(Permission.CAN_BUY_MEDICATIONS);

    const result = await this.prisma.$transaction(async (tx) => {
      const account = await tx.customerAccount.create({
        data: {
          businessName: application.businessName,
          legalName: application.legalName,
          rut: application.rut,
          phone: application.phone,
          address: application.address,
          city: application.city,
          department: application.department,
          addresses: application.address?.trim()
            ? { create: { label: 'Principal', address: application.address.trim(), city: application.city, department: application.department } }
            : undefined,
          accountStatus: 'APPROVED',
          medicationPermission,
        },
      });

      const user = await tx.user.create({
        data: {
          customerAccountId: account.id,
          email: application.email,
          passwordHash: application.passwordHash,
          role: Role.CLIENT,
          active: true,
          emailVerified: true,
          permissions: { create: permissions.map((permission) => ({ permission })) },
        },
        include: { permissions: true, customerAccount: true },
      });

      await tx.customerDocument.updateMany({
        where: { applicationId: application.id },
        data: { customerAccountId: account.id },
      });

      await tx.customerApplication.update({
        where: { id },
        data: {
          status: CustomerApplicationStatus.APPROVED,
          reviewedById,
          reviewedAt: new Date(),
        },
      });

      return user;
    });

    await this.audit.log('CLIENT_APPROVED', 'CustomerApplication', id, reviewedById, { medicationPermission });
    await this.notifications.notify('account.approved', application.email, { applicationId: id, medicationPermission });
    return result;
  }

  async reject(id: string, reviewedById: string, rejectionReason?: string) {
    const application = await this.prisma.customerApplication.findUnique({ where: { id } });
    if (!application) {
      throw new NotFoundException('Solicitud no encontrada.');
    }
    const updated = await this.prisma.customerApplication.update({
      where: { id },
      data: {
        status: CustomerApplicationStatus.REJECTED,
        reviewedById,
        reviewedAt: new Date(),
        rejectionReason,
      },
    });
    await this.audit.log('CLIENT_REJECTED', 'CustomerApplication', id, reviewedById, { rejectionReason });
    await this.notifications.notify('account.rejected', application.email, { applicationId: id, rejectionReason });
    return updated;
  }
}
