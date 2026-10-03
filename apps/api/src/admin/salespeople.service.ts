import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerListQueryDto } from './dto/admin-list-query.dto';
import { SaveSalespersonDto } from './dto/save-salesperson.dto';

@Injectable()
export class SalespeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CustomerListQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      role: Role.SALES,
      customerAccountId: null,
      OR: search ? [
        { email: { contains: search, mode: 'insensitive' } },
        { salesperson: { is: { name: { contains: search, mode: 'insensitive' } } } },
        { salesperson: { is: { phone: { contains: search } } } },
      ] : undefined,
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { email: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true, email: true, active: true, emailVerified: true,
          salesperson: { select: { id: true, name: true, phone: true, _count: { select: { customers: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: users.map(({ salesperson, ...user }) => ({ ...user,
      profile: salesperson ? { id: salesperson.id, name: salesperson.name, phone: salesperson.phone, customerCount: salesperson._count.customers } : null,
    })), meta: { total, page: query.page, limit: query.limit } };
  }

  async detail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, role: true, active: true, emailVerified: true, customerAccountId: true,
        salesperson: { select: { id: true, name: true, phone: true, customers: {
          orderBy: { businessName: 'asc' },
          select: { id: true, businessName: true, legalName: true, rut: true, accountStatus: true,
            users: { select: { email: true }, take: 1 } },
        } } },
      },
    });
    if (!user || user.role !== Role.SALES || user.customerAccountId) throw new NotFoundException('Vendedor no encontrado.');
    const { role: _role, customerAccountId: _customerAccountId, salesperson, ...visible } = user;
    return { ...visible, profile: salesperson ? { id: salesperson.id, name: salesperson.name, phone: salesperson.phone } : null,
      customers: salesperson?.customers ?? [] };
  }

  async save(userId: string, dto: SaveSalespersonDto, actorId: string) {
    const name = dto.name.trim();
    const phone = dto.phone.trim();
    if (name.length < 2 || !/^\+?[\d\s().-]{6,30}$/.test(phone) || phone.replace(/\D/g, '').length < 6) throw new BadRequestException('Revisá el nombre y el teléfono.');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, customerAccountId: true, email: true } });
      if (!user || user.role !== Role.SALES || user.customerAccountId) throw new NotFoundException('Vendedor no encontrado.');
      const previous = await tx.salesperson.findUnique({ where: { userId }, select: { name: true, phone: true } });
      const profile = await tx.salesperson.upsert({ where: { userId }, create: { userId, name, phone }, update: { name, phone } });
      await tx.auditLog.create({ data: { action: previous ? 'SALESPERSON_UPDATED' : 'SALESPERSON_CREATED',
        entityType: 'Salesperson', entityId: profile.id, userId: actorId,
        metadata: { email: user.email, before: previous, after: { name, phone } } } });
      return { id: userId, email: user.email, profile: { id: profile.id, name, phone } };
    });
  }

  async assign(userId: string, customerId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const seller = await tx.user.findUnique({ where: { id: userId }, select: {
        role: true, active: true, emailVerified: true, customerAccountId: true,
        salesperson: { select: { id: true, name: true } },
      } });
      if (!seller || seller.role !== Role.SALES || seller.customerAccountId) throw new NotFoundException('Vendedor no encontrado.');
      if (!seller.active || !seller.emailVerified) throw new BadRequestException('Activá la cuenta del vendedor antes de asignarle clientes.');
      if (!seller.salesperson) throw new BadRequestException('Completá el nombre y el teléfono del vendedor antes de asignarle clientes.');
      const customer = await tx.customerAccount.findUnique({ where: { id: customerId }, select: { id: true, salespersonId: true, businessName: true } });
      if (!customer) throw new NotFoundException('Cliente no encontrado.');
      if (customer.salespersonId === seller.salesperson.id) return { customerId, salespersonId: seller.salesperson.id };
      const updated = await tx.customerAccount.updateMany({ where: { id: customerId, salespersonId: customer.salespersonId },
        data: { salespersonId: seller.salesperson.id } });
      if (updated.count !== 1) throw new ConflictException('La asignación del cliente cambió. Volvé a intentarlo.');
      await tx.auditLog.create({ data: { action: 'CUSTOMER_SALESPERSON_ASSIGNED', entityType: 'CustomerAccount', entityId: customerId, userId: actorId,
        metadata: { businessName: customer.businessName, fromSalespersonId: customer.salespersonId, toSalespersonId: seller.salesperson.id } } });
      return { customerId, salespersonId: seller.salesperson.id };
    });
  }

  async unassign(userId: string, customerId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const seller = await tx.user.findUnique({ where: { id: userId }, select: { salesperson: { select: { id: true } } } });
      if (!seller?.salesperson) throw new NotFoundException('Vendedor no encontrado.');
      const updated = await tx.customerAccount.updateMany({ where: { id: customerId, salespersonId: seller.salesperson.id }, data: { salespersonId: null } });
      if (updated.count !== 1) throw new ConflictException('Este cliente ya no está asignado al vendedor.');
      await tx.auditLog.create({ data: { action: 'CUSTOMER_SALESPERSON_REMOVED', entityType: 'CustomerAccount', entityId: customerId, userId: actorId,
        metadata: { fromSalespersonId: seller.salesperson.id } } });
      return { customerId, salespersonId: null };
    });
  }
}
