import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactInquiryStatus, Prisma, Role } from '@prisma/client';
import { JwtUser } from '../common/types/jwt-user.type';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContactInquiryQueryDto } from './dto/contact-inquiry-query.dto';
import { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';
import { UpdateContactInquiryDto } from './dto/update-contact-inquiry.dto';

const clean = (value?: string) => value?.trim().replace(/\s+/g, ' ') || undefined;
const legacySelect = { id: true, name: true, businessName: true, email: true, phone: true, locality: true, message: true, status: true, internalNote: true, handledById: true, resolvedAt: true, createdAt: true, updatedAt: true, handledBy: { select: { id: true, email: true } } } as const satisfies Prisma.ContactInquirySelect;

@Injectable()
export class ContactInquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateContactInquiryDto) {
    // Bots receive the same success shape, but their payload is not persisted.
    if (dto.website?.trim()) return { received: true };

    const inquiry = await this.prisma.contactInquiry.create({
      data: {
        name: clean(dto.name)!,
        businessName: clean(dto.businessName),
        email: dto.email.trim().toLowerCase(),
        phone: clean(dto.phone),
        locality: clean(dto.locality),
        message: dto.message.trim(),
      },
      select: { id: true, createdAt: true },
    });

    await this.notifications.notify('contact.received', 'contacto@districo.com.uy', {
      inquiryId: inquiry.id,
    });
    return { received: true, ...inquiry };
  }

  private async select() {
    return await this.prisma.operationalSchemaReady?.() ? { ...legacySelect, customerId: true, orderId: true, assignedToId: true, responseDueAt: true } as const : legacySelect;
  }

  async findMany(query: ContactInquiryQueryDto, user?: JwtUser) {
    const where = await this.where(query, user);
    return this.prisma.contactInquiry.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: await this.select(),
    });
  }

  async findPage(query: ContactInquiryQueryDto, user?: JwtUser) {
    const where = await this.where(query, user);
    const select = await this.select();
    const [items, total] = await Promise.all([
      this.prisma.contactInquiry.findMany({ where, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit, select }),
      this.prisma.contactInquiry.count({ where }),
    ]);
    const ids = items.flatMap((item) => 'assignedToId' in item && typeof item.assignedToId === 'string' ? [item.assignedToId] : []);
    const assignees = ids.length ? await this.prisma.user.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, email: true } }) : [];
    return { items: items.map((item) => ({ ...item, assignedTo: 'assignedToId' in item ? assignees.find((assignee) => assignee.id === item.assignedToId) ?? null : null })), meta: { total, page: query.page, limit: query.limit } };
  }

  private async where(query: ContactInquiryQueryDto, user?: JwtUser): Promise<Prisma.ContactInquiryWhereInput> {
    const search = clean(query.search);
    const where: Prisma.ContactInquiryWhereInput = {
      status: query.status,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { businessName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { locality: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    if (user?.role === Role.SALES && await this.prisma.operationalSchemaReady?.()) {
      const customers = await this.prisma.customerAccount.findMany({ where: { salesperson: { userId: user.sub } }, select: { id: true } });
      where.AND = [{ OR: [{ customerId: null }, { customerId: { in: customers.map((customer) => customer.id) } }] }];
    }
    return where;
  }

  async update(id: string, dto: UpdateContactInquiryDto, actor: string | JwtUser) {
    const userId = typeof actor === 'string' ? actor : actor.sub;
    const where = await this.where({ page: 1, limit: 1 }, typeof actor === 'string' ? undefined : actor);
    const select = await this.select();
    const current = typeof actor === 'string' ? await this.prisma.contactInquiry.findUnique({ where: { id }, select }) : await this.prisma.contactInquiry.findFirst({ where: { ...where, id }, select });
    if (!current) throw new NotFoundException('Consulta no encontrada.');

    const status = dto.status ?? current.status;
    const updated = await this.prisma.contactInquiry.update({
      where: { id },
      data: {
        status,
        internalNote: dto.internalNote === undefined ? undefined : clean(dto.internalNote) ?? null,
        handledById: userId,
        resolvedAt:
          status === ContactInquiryStatus.RESOLVED
            ? current.resolvedAt ?? new Date()
            : null,
      },
      select,
    });
    await this.audit.log('CONTACT_INQUIRY_UPDATED', 'ContactInquiry', id, userId, {
      from: current.status,
      to: status,
      noteChanged: dto.internalNote !== undefined,
    });
    return updated;
  }
}
