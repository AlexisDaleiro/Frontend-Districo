import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountAddressDto, UpdateAccountAddressDto } from './dto/account-address.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  private async accountId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { active: true, role: true, customerAccountId: true },
    });
    if (!user?.active || user.role !== Role.CLIENT || !user.customerAccountId) {
      throw new ForbiddenException('No hay una cuenta de cliente activa.');
    }
    return user.customerAccountId;
  }

  private required(value: string, field: string) {
    const trimmed = value.trim();
    if (!trimmed) throw new BadRequestException(`${field} no puede quedar vacío.`);
    return trimmed;
  }

  private async syncPrimaryAddress(tx: Prisma.TransactionClient, customerAccountId: string) {
    const primary = await tx.customerAddress.findFirst({
      where: { customerAccountId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    await tx.customerAccount.update({
      where: { id: customerAccountId },
      data: {
        address: primary?.address ?? null,
        city: primary?.city ?? null,
        department: primary?.department ?? null,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateAccountDto) {
    const customerAccountId = await this.accountId(userId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.customerAccount.update({
          where: { id: customerAccountId },
          data: {
            businessName: dto.businessName === undefined ? undefined : this.required(dto.businessName, 'Nombre comercial'),
            legalName: dto.legalName === undefined ? undefined : this.required(dto.legalName, 'Razón social'),
            rut: dto.rut === undefined ? undefined : this.required(dto.rut, 'RUT'),
          },
        });
        await tx.auditLog.create({
          data: { action: 'CUSTOMER_PROFILE_UPDATED', entityType: 'CustomerAccount', entityId: customerAccountId, userId, metadata: { fields: Object.keys(dto) } },
        });
        return updated;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe otra cuenta con ese RUT.');
      }
      throw error;
    }
  }

  async createAddress(userId: string, dto: CreateAccountAddressDto) {
    const customerAccountId = await this.accountId(userId);
    return this.prisma.$transaction(async (tx) => {
      const address = await tx.customerAddress.create({
        data: {
          customerAccountId,
          label: this.required(dto.label, 'Nombre de la dirección'),
          address: this.required(dto.address, 'Dirección'),
          city: dto.city?.trim() || null,
          department: dto.department?.trim() || null,
        },
      });
      await this.syncPrimaryAddress(tx, customerAccountId);
      await tx.auditLog.create({
        data: { action: 'CUSTOMER_ADDRESS_CREATED', entityType: 'CustomerAddress', entityId: address.id, userId },
      });
      return address;
    });
  }

  async updateAddress(userId: string, id: string, dto: UpdateAccountAddressDto) {
    const customerAccountId = await this.accountId(userId);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.customerAddress.findFirst({ where: { id, customerAccountId } });
      if (!existing) throw new NotFoundException('Dirección no encontrada.');
      const address = await tx.customerAddress.update({
        where: { id, customerAccountId },
        data: {
          label: dto.label === undefined ? undefined : this.required(dto.label, 'Nombre de la dirección'),
          address: dto.address === undefined ? undefined : this.required(dto.address, 'Dirección'),
          city: dto.city === undefined ? undefined : dto.city.trim() || null,
          department: dto.department === undefined ? undefined : dto.department.trim() || null,
        },
      });
      await this.syncPrimaryAddress(tx, customerAccountId);
      await tx.auditLog.create({
        data: { action: 'CUSTOMER_ADDRESS_UPDATED', entityType: 'CustomerAddress', entityId: id, userId },
      });
      return address;
    });
  }

  async deleteAddress(userId: string, id: string) {
    const customerAccountId = await this.accountId(userId);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.customerAddress.findFirst({ where: { id, customerAccountId } });
      if (!existing) throw new NotFoundException('Dirección no encontrada.');
      await tx.customerAddress.delete({ where: { id, customerAccountId } });
      await this.syncPrimaryAddress(tx, customerAccountId);
      await tx.auditLog.create({
        data: { action: 'CUSTOMER_ADDRESS_DELETED', entityType: 'CustomerAddress', entityId: id, userId },
      });
      return { success: true };
    });
  }
}
