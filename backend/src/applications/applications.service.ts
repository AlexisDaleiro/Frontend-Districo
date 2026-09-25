import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerApplicationStatus, Permission, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';

const ALLOWED_DOCUMENT_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateApplicationDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingUser) {
      throw new BadRequestException('Ya existe un usuario con ese email.');
    }

    for (const document of dto.documents ?? []) {
      if (!ALLOWED_DOCUMENT_MIME_TYPES.has(document.mimeType)) {
        throw new BadRequestException('Formato de documento no permitido.');
      }
    }

    const application = await this.prisma.customerApplication.create({
      data: {
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
        documents: dto.documents?.length
          ? {
              create: dto.documents.map((document) => ({
                type: document.type,
                fileUrl: document.fileUrl,
                originalName: document.originalName,
                mimeType: document.mimeType,
              })),
            }
          : undefined,
      },
      include: { documents: true },
    });

    await this.notifications.notify('registration.received', application.email, { applicationId: application.id });
    return application;
  }

  findMany() {
    return this.prisma.customerApplication.findMany({
      orderBy: { createdAt: 'desc' },
      include: { documents: true },
    });
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
