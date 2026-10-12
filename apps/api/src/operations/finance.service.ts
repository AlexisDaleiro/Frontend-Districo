import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { JwtUser } from "../common/types/jwt-user.type";
import {
  MovementDto,
  MovementImportDto,
  OperationsQueryDto,
  ReconcileDto,
  FollowupDto,
} from "./dto/operations.dto";
import {
  agingBucket,
  cents,
  overdueInstallments,
  remaining,
} from "./operation-rules";
import { parseMovements } from "./movement-import";

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}
  async importPreview(csv: string) {
    const parsed = parseMovements(csv);
    const existing = await this.prisma.bankMovement.findMany({
      where: {
        reference: { in: parsed.movements.map((row) => row.reference) },
      },
      select: { reference: true, amount: true, currency: true },
    });
    const conflicts = parsed.movements
      .filter((row) =>
        existing.some(
          (item) =>
            item.reference === row.reference &&
            (cents(item.amount) !== cents(row.amount) ||
              item.currency !== row.currency),
        ),
      )
      .map((row) => row.reference);
    return {
      total: parsed.movements.length + parsed.errors.length,
      toCreate: parsed.movements.length - existing.length,
      alreadyPresent: existing.length,
      errors: parsed.errors,
      conflicts,
      sample: parsed.movements.slice(0, 10),
    };
  }
  async importMovements(dto: MovementImportDto, user: JwtUser) {
    const parsed = parseMovements(dto.csv);
    if (parsed.errors.length)
      throw new BadRequestException(
        "Corregí las filas inválidas antes de importar.",
      );
    if (!parsed.movements.length)
      throw new BadRequestException("El archivo no tiene movimientos válidos.");
    const digest = createHash("sha256")
      .update(JSON.stringify(parsed.movements))
      .digest("hex");
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${dto.requestId}))::text`;
      const previous = await tx.auditLog.findUnique({
        where: { id: dto.requestId },
      });
      if (previous) {
        if (
          previous.action !== "BANK_MOVEMENTS_IMPORTED" ||
          (previous.metadata as { digest?: string })?.digest !== digest
        )
          throw new ConflictException(
            "La operación ya se usó con otro archivo.",
          );
        return previous.metadata;
      }
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('bank-reference:' || reference))::text FROM (SELECT unnest(ARRAY[${Prisma.join(parsed.movements.map((row) => row.reference))}]::text[]) AS reference ORDER BY reference) locks`;
      const existing = await tx.bankMovement.findMany({
        where: {
          reference: { in: parsed.movements.map((row) => row.reference) },
        },
      });
      if (
        parsed.movements.some((row) =>
          existing.some(
            (item) =>
              item.reference === row.reference &&
              (cents(item.amount) !== cents(row.amount) ||
                item.currency !== row.currency),
          ),
        )
      )
        throw new ConflictException(
          "Una referencia existente tiene otro importe o moneda. No se sobrescribió ningún movimiento.",
        );
      const created = await tx.bankMovement.createMany({
        skipDuplicates: true,
        data: parsed.movements.map((row) => ({
          ...row,
          occurredAt: new Date(row.occurredAt),
          recordedById: user.sub,
        })),
      });
      const result = {
        digest,
        created: created.count,
        alreadyPresent: parsed.movements.length - created.count,
      };
      await tx.auditLog.create({
        data: {
          id: dto.requestId,
          userId: user.sub,
          action: "BANK_MOVEMENTS_IMPORTED",
          entityType: "BankMovementBatch",
          metadata: result,
        },
      });
      return result;
    });
  }
  async movements(query: OperationsQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.BankMovementWhereInput = {
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.bankMovement.findMany({
        where,
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          reconciliations: {
            where: { voidedAt: null },
            include: {
              payment: {
                select: {
                  id: true,
                  voidedAt: true,
                  amount: true,
                  order: { select: { id: true, orderNumber: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.bankMovement.count({ where }),
    ]);
    return {
      items: items.map((item) => {
        const matched =
          item.reconciliations.reduce(
            (sum, match) => sum + cents(match.amount),
            0,
          ) / 100;
        return {
          ...item,
          matched,
          difference: Number(item.amount) - matched,
          conflict: item.reconciliations.some(
            (match) => !!match.payment.voidedAt,
          ),
        };
      }),
      meta: { total, page: query.page, limit: query.limit },
    };
  }
  async createMovement(dto: MovementDto, user: JwtUser) {
    if (!dto.reference.trim() || !dto.description.trim())
      throw new BadRequestException("Completá referencia y descripción.");
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`bank-reference:${dto.reference.trim()}`}))::text`;
        const row = await tx.bankMovement.create({
          data: {
            ...dto,
            reference: dto.reference.trim(),
            description: dto.description.trim(),
            occurredAt: new Date(dto.occurredAt),
            recordedById: user.sub,
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.sub,
            action: "BANK_MOVEMENT_CREATED",
            entityType: "BankMovement",
            entityId: row.id,
          },
        });
        return row;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("La referencia ya fue cargada.");
      throw error;
    }
  }
  async payments(query: OperationsQueryDto) {
    const where: Prisma.OrderPaymentWhereInput = {
      voidedAt: null,
      ...(query.search?.trim()
        ? {
            order: {
              orderNumber: {
                contains: query.search.trim(),
                mode: "insensitive",
              },
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.orderPayment.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          amount: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              currency: true,
              customerAccount: { select: { businessName: true } },
            },
          },
          reconciliations: {
            where: { voidedAt: null },
            select: { amount: true },
          },
        },
      }),
      this.prisma.orderPayment.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        ...item,
        unmatched:
          Math.max(
            0,
            cents(item.amount) -
              item.reconciliations.reduce(
                (sum, match) => sum + cents(match.amount),
                0,
              ),
          ) / 100,
      })),
      meta: { total, page: query.page, limit: query.limit },
    };
  }
  async reconcile(dto: ReconcileDto, user: JwtUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "BankMovement" WHERE "id" = ${dto.movementId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "OrderPayment" WHERE "id" = ${dto.paymentId} FOR UPDATE`;
      const previous = await tx.paymentReconciliation.findUnique({
        where: { id: dto.requestId },
      });
      if (previous) {
        if (
          previous.movementId !== dto.movementId ||
          previous.paymentId !== dto.paymentId ||
          cents(previous.amount) !== cents(dto.amount)
        )
          throw new ConflictException(
            "Esta operación ya se usó con otros valores.",
          );
        return previous;
      }
      const movement = await tx.bankMovement.findUnique({
        where: { id: dto.movementId },
        include: { reconciliations: { where: { voidedAt: null } } },
      });
      const payment = await tx.orderPayment.findUnique({
        where: { id: dto.paymentId },
        include: {
          order: { select: { currency: true } },
          reconciliations: { where: { voidedAt: null } },
        },
      });
      if (!movement || !payment || payment.voidedAt)
        throw new NotFoundException("Movimiento o pago no disponible.");
      if (movement.currency !== payment.order.currency)
        throw new BadRequestException("Las monedas no coinciden.");
      const requested = cents(dto.amount);
      if (
        requested <= 0 ||
        requested >
          cents(movement.amount) -
            movement.reconciliations.reduce(
              (sum, row) => sum + cents(row.amount),
              0,
            ) ||
        requested >
          cents(payment.amount) -
            payment.reconciliations.reduce(
              (sum, row) => sum + cents(row.amount),
              0,
            )
      )
        throw new BadRequestException(
          "El importe supera el saldo por conciliar.",
        );
      const row = await tx.paymentReconciliation.create({
        data: {
          id: dto.requestId,
          movementId: dto.movementId,
          paymentId: dto.paymentId,
          amount: dto.amount,
          recordedById: user.sub,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.sub,
          action: "PAYMENT_RECONCILED",
          entityType: "PaymentReconciliation",
          entityId: row.id,
          metadata: {
            movementId: dto.movementId,
            paymentId: dto.paymentId,
            amount: dto.amount,
          },
        },
      });
      return row;
    });
  }
  async voidMatch(id: string, reason: string, user: JwtUser) {
    return this.prisma.$transaction(async (tx) => {
      const match = await tx.paymentReconciliation.findUnique({
        where: { id },
      });
      if (!match) throw new NotFoundException("Conciliación no encontrada.");
      await tx.$queryRaw`SELECT "id" FROM "BankMovement" WHERE "id" = ${match.movementId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "OrderPayment" WHERE "id" = ${match.paymentId} FOR UPDATE`;
      if (!reason.trim()) throw new BadRequestException("Indicá el motivo.");
      const changed = await tx.paymentReconciliation.updateMany({
        where: { id, voidedAt: null },
        data: {
          voidedAt: new Date(),
          voidedById: user.sub,
          voidReason: reason.trim(),
        },
      });
      if (changed.count)
        await tx.auditLog.create({
          data: {
            userId: user.sub,
            action: "PAYMENT_RECONCILIATION_VOIDED",
            entityType: "PaymentReconciliation",
            entityId: id,
            metadata: { reason: reason.trim() },
          },
        });
      return { success: true };
    });
  }
  async receivables(query: OperationsQueryDto) {
    const terms = [
      Prisma.sql`o."status"::text NOT IN ('DRAFT','CANCELLED','REJECTED')`,
      Prisma.sql`o."total" - o."creditedTotal" - o."paidTotal" + o."refundedTotal" > 0`,
    ];
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      terms.push(
        Prisma.sql`(o."orderNumber" ILIKE ${term} OR EXISTS (SELECT 1 FROM "CustomerAccount" c WHERE c."id" = o."customerAccountId" AND c."businessName" ILIKE ${term}))`,
      );
    }
    const predicate = Prisma.join(terms, " AND ");
    const [ids, count] = await this.prisma.$transaction([
      this.prisma.$queryRaw<
        { id: string }[]
      >`SELECT o."id" FROM "Order" o WHERE ${predicate} ORDER BY o."paymentDueAt" ASC NULLS LAST, o."id" ASC LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`,
      this.prisma.$queryRaw<
        { total: number }[]
      >`SELECT count(*)::integer AS total FROM "Order" o WHERE ${predicate}`,
    ]);
    const found = await this.prisma.order.findMany({
      where: { id: { in: ids.map((row) => row.id) } },
      select: {
        id: true,
        orderNumber: true,
        currency: true,
        total: true,
        paidTotal: true,
        creditedTotal: true,
        refundedTotal: true,
        paymentDueAt: true,
        paymentSchedule: true,
        customerAccount: { select: { businessName: true, phone: true } },
      },
    });
    const byId = new Map(found.map((row) => [row.id, row]));
    const orders = ids.flatMap((row) => {
      const order = byId.get(row.id);
      return order ? [order] : [];
    });
    const notes = orders.length
      ? await this.prisma.$queryRaw<
          {
            id: string;
            orderId: string;
            note: string;
            nextContactAt: Date | null;
            createdAt: Date;
          }[]
        >`
      SELECT "id", "orderId", "note", "nextContactAt", "createdAt" FROM (
        SELECT "id", "orderId", "note", "nextContactAt", "createdAt", row_number() OVER (PARTITION BY "orderId" ORDER BY "createdAt" DESC, "id" DESC) AS position
        FROM "CollectionFollowup" WHERE "orderId" IN (${Prisma.join(orders.map((order) => order.id))})
      ) notes WHERE position <= 10 ORDER BY "createdAt" DESC`
      : [];
    return {
      items: orders.map((order) => {
        const dueAt = overdueInstallments(order);
        const bucket = agingBucket(dueAt);
        return {
          ...order,
          balance: remaining(
            order.total,
            order.paidTotal,
            order.creditedTotal,
            order.refundedTotal,
          ),
          dueAt,
          bucket,
          followups: notes.filter((note) => note.orderId === order.id),
        };
      }),
      meta: {
        total: count[0]?.total ?? 0,
        page: query.page,
        limit: query.limit,
      },
    };
  }
  async followup(orderId: string, dto: FollowupDto, user: JwtUser) {
    if (!dto.note.trim())
      throw new BadRequestException("Escribí la gestión realizada.");
    if (
      !(await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true },
      }))
    )
      throw new NotFoundException("Pedido no encontrado.");
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.collectionFollowup.findUnique({
        where: { id: dto.requestId },
      });
      if (previous) {
        if (
          previous.orderId !== orderId ||
          previous.note !== dto.note.trim() ||
          (previous.nextContactAt?.toISOString() ?? null) !==
            (dto.nextContactAt
              ? new Date(dto.nextContactAt).toISOString()
              : null)
        )
          throw new ConflictException("La operación ya fue utilizada.");
        return previous;
      }
      const row = await tx.collectionFollowup.create({
        data: {
          id: dto.requestId,
          orderId,
          note: dto.note.trim(),
          nextContactAt: dto.nextContactAt ? new Date(dto.nextContactAt) : null,
          recordedById: user.sub,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.sub,
          action: "COLLECTION_FOLLOWUP_RECORDED",
          entityType: "Order",
          entityId: orderId,
        },
      });
      return row;
    });
  }
}
