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
import { NotificationsService } from "../notifications/notifications.service";
import { JwtUser } from "../common/types/jwt-user.type";
import { defaultStaffAccess } from "../common/staff-role-access";
import {
  CustomerInquiryDto,
  InquiryAssignmentDto,
  InquiryEntryDto,
} from "./dto/operations.dto";

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}
  async lookups(user: JwtUser, search?: string) {
    const scope: Prisma.CustomerAccountWhereInput =
      user.role === Role.SALES ? { salesperson: { userId: user.sub } } : {};
    const term = search?.trim();
    const customers = await this.prisma.customerAccount.findMany({
      where: {
        ...scope,
        ...(term
          ? { businessName: { contains: term, mode: "insensitive" } }
          : {}),
      },
      select: { id: true, businessName: true },
      orderBy: { businessName: "asc" },
      take: 20,
    });
    const orders = await this.prisma.order.findMany({
      where: {
        customerAccount: scope,
        ...(term
          ? {
              OR: [
                { orderNumber: { contains: term, mode: "insensitive" } },
                {
                  customerAccount: {
                    businessName: { contains: term, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      select: { id: true, orderNumber: true, customerAccountId: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return { customers, orders };
  }
  async staff() {
    const users = await this.prisma.user.findMany({
      where: { active: true, role: { not: Role.CLIENT } },
      select: { id: true, email: true, role: true, customRoleId: true },
      orderBy: { email: "asc" },
    });
    const overrides = await this.prisma.staffRoleAccess.findMany({
      where: { feature: "consultas" },
    });
    const custom = await this.prisma.customStaffRoleAccess.findMany({
      where: { feature: "consultas", canView: true },
    });
    return users.filter(
      (user) =>
        user.role === Role.ADMIN ||
        (user.role === Role.CUSTOM
          ? custom.some((access) => access.roleId === user.customRoleId)
          : (
              overrides.find((access) => access.role === user.role) ??
              defaultStaffAccess(user.role, "consultas")
            ).canView),
    );
  }
  private async inquiry(id: string, user: JwtUser) {
    const row = await this.prisma.contactInquiry.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Consulta no encontrada.");
    if (
      user.role === Role.SALES &&
      row.customerId &&
      !(await this.prisma.customerAccount.findFirst({
        where: { id: row.customerId, salesperson: { userId: user.sub } },
        select: { id: true },
      }))
    )
      throw new ForbiddenException("El cliente no está asignado a tu cartera.");
    return row;
  }
  async detail(id: string, user: JwtUser) {
    const row = await this.inquiry(id, user);
    const entries = await this.prisma.inquiryEntry.findMany({
      where: { inquiryId: id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: undefined,
    });
    const customer = row.customerId
      ? await this.prisma.customerAccount.findUnique({
          where: { id: row.customerId },
          select: { id: true, businessName: true },
        })
      : null;
    const order = row.orderId
      ? await this.prisma.order.findUnique({
          where: { id: row.orderId },
          select: { id: true, orderNumber: true },
        })
      : null;
    return { ...row, entries, customer, order, staff: await this.staff() };
  }
  async assign(id: string, dto: InquiryAssignmentDto, user: JwtUser) {
    const row = await this.inquiry(id, user);
    const orderId =
      dto.orderId === undefined ? row.orderId : dto.orderId || null;
    const order = orderId
      ? await this.prisma.order.findUnique({
          where: { id: orderId },
          select: { customerAccountId: true },
        })
      : null;
    if (orderId && !order) throw new NotFoundException("Pedido no encontrado.");
    const customerId =
      dto.customerId === undefined
        ? (order?.customerAccountId ?? row.customerId)
        : dto.customerId || null;
    if (orderId && (!customerId || order?.customerAccountId !== customerId))
      throw new BadRequestException(
        "El pedido no pertenece al cliente seleccionado.",
      );
    if (
      customerId &&
      !(await this.prisma.customerAccount.findFirst({
        where: {
          id: customerId,
          ...(user.role === Role.SALES
            ? { salesperson: { userId: user.sub } }
            : {}),
        },
        select: { id: true },
      }))
    )
      throw new ForbiddenException("Cliente no disponible para tu usuario.");
    if (
      dto.assignedToId &&
      !(await this.staff()).some((staff) => staff.id === dto.assignedToId)
    )
      throw new BadRequestException(
        "El responsable debe tener acceso a consultas.",
      );
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.contactInquiry.update({
        where: { id },
        data: {
          customerId,
          orderId,
          assignedToId:
            dto.assignedToId === undefined
              ? undefined
              : dto.assignedToId || null,
          responseDueAt: dto.responseDueAt
            ? new Date(dto.responseDueAt)
            : undefined,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.sub,
          action: "INQUIRY_ASSIGNED",
          entityType: "ContactInquiry",
          entityId: id,
          metadata: {
            customerId,
            orderId,
            assignedToId: dto.assignedToId ?? null,
          },
        },
      });
      return updated;
    });
  }
  async addEntry(id: string, dto: InquiryEntryDto, user: JwtUser) {
    const row = await this.inquiry(id, user);
    if (!dto.body.trim()) throw new BadRequestException("Escribí el mensaje.");
    if (dto.sendEmail && dto.visibility !== "CUSTOMER")
      throw new BadRequestException(
        "Una nota interna no puede enviarse al cliente.",
      );
    if (dto.sendEmail && !this.notifications.settings().ready)
      throw new ServiceUnavailableException(
        "El correo no está configurado. Guardá la respuesta sin enviarla.",
      );
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.inquiryEntry.findUnique({
        where: { id: dto.requestId },
      });
      if (previous) {
        if (
          previous.inquiryId !== id ||
          previous.body !== dto.body.trim() ||
          previous.visibility !== dto.visibility ||
          !!previous.notificationId !== !!dto.sendEmail
        )
          throw new ConflictException("La operación ya fue utilizada.");
        return previous;
      }
      const notification = dto.sendEmail
        ? await this.notifications.enqueue(
            "support.reply",
            row.email,
            {
              subject: "DISTRICO: respuesta a tu consulta",
              text: dto.body.trim(),
            },
            { inquiryId: id },
            tx,
          )
        : undefined;
      const entry = await tx.inquiryEntry.create({
        data: {
          id: dto.requestId,
          inquiryId: id,
          body: dto.body.trim(),
          visibility: dto.visibility,
          recordedById: user.sub,
          notificationId: notification?.id,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.sub,
          action: "INQUIRY_ENTRY_CREATED",
          entityType: "ContactInquiry",
          entityId: id,
          metadata: { visibility: dto.visibility, emailQueued: !!notification },
        },
      });
      return entry;
    });
  }
  async myThreads(user: JwtUser) {
    if (user.role !== Role.CLIENT || !user.customerAccountId)
      throw new ForbiddenException("Acceso exclusivo para clientes.");
    return this.prisma.contactInquiry.findMany({
      where: { customerId: user.customerAccountId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        message: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        orderId: true,
        entries: {
          where: { visibility: "CUSTOMER" },
          select: { id: true, body: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }
  async createMine(dto: CustomerInquiryDto, user: JwtUser) {
    if (user.role !== Role.CLIENT || !user.customerAccountId)
      throw new ForbiddenException("Acceso exclusivo para clientes.");
    const account = await this.prisma.customerAccount.findUniqueOrThrow({
      where: { id: user.customerAccountId },
      select: { businessName: true, phone: true },
    });
    if (
      dto.orderId &&
      !(await this.prisma.order.findFirst({
        where: { id: dto.orderId, userId: user.sub },
        select: { id: true },
      }))
    )
      throw new NotFoundException("Pedido no encontrado.");
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.contactInquiry.findUnique({
        where: { id: dto.requestId },
      });
      if (previous) {
        if (
          previous.customerId !== user.customerAccountId ||
          previous.email !== user.email ||
          previous.message !== dto.message.trim() ||
          (previous.orderId ?? null) !== (dto.orderId ?? null)
        )
          throw new ConflictException("La operación ya fue utilizada.");
        return { received: true };
      }
      await tx.contactInquiry.create({
        data: {
          id: dto.requestId,
          customerId: user.customerAccountId,
          orderId: dto.orderId,
          name: account.businessName,
          businessName: account.businessName,
          email: user.email,
          phone: account.phone,
          message: dto.message.trim(),
          responseDueAt: new Date(Date.now() + 2 * 86400000),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.sub,
          action: "CUSTOMER_INQUIRY_CREATED",
          entityType: "ContactInquiry",
          entityId: dto.requestId,
        },
      });
      return { received: true };
    });
  }
}
