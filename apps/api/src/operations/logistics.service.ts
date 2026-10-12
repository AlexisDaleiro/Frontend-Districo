import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { JwtUser } from "../common/types/jwt-user.type";
import {
  DeliveryDto,
  FulfillmentDto,
  OperationsQueryDto,
} from "./dto/operations.dto";
import { validateQuantities } from "./operation-rules";

const pickingSelect = {
  id: true,
  orderNumber: true,
  status: true,
  createdAt: true,
  deliveryLabel: true,
  deliveryAddress: true,
  deliveryCity: true,
  deliveryDepartment: true,
  customerAccount: { select: { businessName: true } },
  items: {
    select: {
      id: true,
      productName: true,
      variantName: true,
      sku: true,
      quantity: true,
    },
  },
  fulfillments: { orderBy: { createdAt: "asc" }, include: { items: true } },
} as const satisfies Prisma.OrderSelect;
@Injectable()
export class LogisticsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(query: OperationsQueryDto) {
    const where: Prisma.OrderWhereInput = {
      status: {
        in:
          query.filter === "DELIVERED"
            ? [OrderStatus.DELIVERED]
            : [
                OrderStatus.APPROVED,
                OrderStatus.PROCESSING,
                OrderStatus.SHIPPED,
              ],
      },
      ...(query.search?.trim()
        ? {
            OR: [
              {
                orderNumber: {
                  contains: query.search.trim(),
                  mode: "insensitive",
                },
              },
              {
                customerAccount: {
                  businessName: {
                    contains: query.search.trim(),
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        select: pickingSelect,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, meta: { total, page: query.page, limit: query.limit } };
  }
  async prepare(orderId: string, dto: FulfillmentDto, user: JwtUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
      const previous = await tx.orderFulfillment.findUnique({
        where: { id: dto.requestId },
        include: { items: true },
      });
      if (previous) {
        if (
          previous.orderId !== orderId ||
          JSON.stringify(
            previous.items
              .map((line) => `${line.orderItemId}:${line.quantity}`)
              .sort(),
          ) !==
            JSON.stringify(
              dto.items
                .map((line) => `${line.orderItemId}:${line.quantity}`)
                .sort(),
            )
        )
          throw new ConflictException(
            "La operación ya fue usada con otras cantidades.",
          );
        return previous;
      }
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: pickingSelect,
      });
      if (!order) throw new NotFoundException("Pedido no encontrado.");
      if (
        ![
          OrderStatus.APPROVED,
          OrderStatus.PROCESSING,
          OrderStatus.SHIPPED,
        ].includes(order.status as never)
      )
        throw new BadRequestException(
          "Aprobá el pedido antes de preparar una entrega.",
        );
      const pending = new Map(
        order.items.map((line) => [
          line.id,
          line.quantity -
            order.fulfillments
              .flatMap((batch) => batch.items)
              .filter((item) => item.orderItemId === line.id)
              .reduce((sum, item) => sum + item.quantity, 0),
        ]),
      );
      validateQuantities(dto.items, pending);
      const row = await tx.orderFulfillment.create({
        data: {
          id: dto.requestId,
          orderId,
          recordedById: user.sub,
          items: { create: dto.items },
        },
        include: { items: true },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.SHIPPED },
      });
      await tx.auditLog.create({
        data: {
          userId: user.sub,
          action: "ORDER_PARTIAL_SHIPMENT_CREATED",
          entityType: "Order",
          entityId: orderId,
          metadata: {
            fulfillmentId: row.id,
            items: dto.items.map((item) => ({ ...item })),
          },
        },
      });
      return row;
    });
  }
  async deliver(id: string, dto: DeliveryDto, user: JwtUser) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.orderFulfillment.findUnique({ where: { id } });
      if (!batch) throw new NotFoundException("Entrega no encontrada.");
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${batch.orderId} FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({
        where: { id: batch.orderId },
        select: pickingSelect,
      });
      const current = order.fulfillments.find((entry) => entry.id === id)!;
      if (current.deliveredAt) return current;
      if (
        ![
          OrderStatus.SHIPPED,
          OrderStatus.PROCESSING,
          OrderStatus.APPROVED,
        ].includes(order.status as never)
      )
        throw new BadRequestException("El pedido no admite entregas.");
      if (!dto.receivedBy.trim() || !dto.proof.trim())
        throw new BadRequestException(
          "Completá quién recibió y la constancia de entrega.",
        );
      const row = await tx.orderFulfillment.update({
        where: { id },
        data: {
          deliveredAt: new Date(),
          receivedBy: dto.receivedBy.trim(),
          proof: dto.proof.trim(),
        },
      });
      const allDelivered = order.items.every(
        (line) =>
          order.fulfillments
            .filter((entry) => entry.id === id || entry.deliveredAt)
            .flatMap((entry) => entry.items)
            .filter((entry) => entry.orderItemId === line.id)
            .reduce((sum, entry) => sum + entry.quantity, 0) === line.quantity,
      );
      if (allDelivered)
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.DELIVERED },
        });
      await tx.auditLog.create({
        data: {
          userId: user.sub,
          action: "ORDER_DELIVERY_CONFIRMED",
          entityType: "Order",
          entityId: order.id,
          metadata: { fulfillmentId: id, complete: allDelivered },
        },
      });
      return row;
    });
  }
}
