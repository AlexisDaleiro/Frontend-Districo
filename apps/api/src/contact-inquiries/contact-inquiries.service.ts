import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactInquiryStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContactInquiryQueryDto } from './dto/contact-inquiry-query.dto';
import { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';
import { UpdateContactInquiryDto } from './dto/update-contact-inquiry.dto';

const clean = (value?: string) => value?.trim().replace(/\s+/g, ' ') || undefined;

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

  findMany(query: ContactInquiryQueryDto) {
    const where = this.where(query);
    return this.prisma.contactInquiry.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { handledBy: { select: { id: true, email: true } } },
    });
  }

  async findPage(query: ContactInquiryQueryDto) {
    const where = this.where(query);
    const [items, total] = await Promise.all([
      this.prisma.contactInquiry.findMany({ where, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit, include: { handledBy: { select: { id: true, email: true } } } }),
      this.prisma.contactInquiry.count({ where }),
    ]);
    return { items, meta: { total, page: query.page, limit: query.limit } };
  }

  private where(query: ContactInquiryQueryDto): Prisma.ContactInquiryWhereInput {
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
    return where;
  }

  async update(id: string, dto: UpdateContactInquiryDto, userId: string) {
    const current = await this.prisma.contactInquiry.findUnique({ where: { id } });
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
      include: { handledBy: { select: { id: true, email: true } } },
    });
    await this.audit.log('CONTACT_INQUIRY_UPDATED', 'ContactInquiry', id, userId, {
      from: current.status,
      to: status,
      noteChanged: dto.internalNote !== undefined,
    });
    return updated;
  }
}
