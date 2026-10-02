import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductFilterDto } from './dto/product-filter.dto';
import { AdminProductFilterDto } from './dto/admin-product-filter.dto';
import { CategoryHierarchyService } from '../categories/category-hierarchy.service';

const productInclude = () =>
  ({
    brand: true,
    laboratory: true,
    categories: { include: { category: true } },
    variants: {
      where: { deletedAt: null },
      orderBy: [{ weight: 'asc' }, { name: 'asc' }],
      include: {
        prices: {
          where: {
            priceList: { active: true },
            validFrom: { lte: new Date() },
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
          },
          orderBy: { validFrom: 'desc' },
          take: 1,
          include: { priceList: true },
        },
      },
    },
    media: { orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }] },
    attributes: {
      include: {
        attributeValue: { include: { attribute: true } },
      },
    },
  }) satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchy: CategoryHierarchyService,
  ) {}

  async findMany(filters: ProductFilterDto | AdminProductFilterDto, admin = false) {
    const where = await this.productWhere(filters, admin);
    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        relationLoadStrategy: 'join',
        include: productInclude(),
        orderBy: { name: 'asc' },
        skip,
        take: filters.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, meta: { total, page: filters.page, limit: filters.limit } };
  }

  async findCards(filters: ProductFilterDto) {
    const where = await this.productWhere(filters);
    const now = new Date();
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        relationLoadStrategy: 'join',
        select: {
          id: true,
          slug: true,
          name: true,
          featured: true,
          requiresMedicationPermission: true,
          brand: { select: { id: true, name: true } },
          laboratory: { select: { id: true, name: true } },
          media: {
            where: { type: 'IMAGE' },
            orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            take: 1,
            select: { id: true, url: true, alt: true, type: true },
          },
          variants: {
            where: { deletedAt: null, active: true },
            orderBy: [{ weight: 'asc' }, { name: 'asc' }],
            take: 1,
            select: {
              id: true,
              active: true,
              prices: {
                where: {
                  priceList: { active: true },
                  validFrom: { lte: now },
                  OR: [{ validUntil: null }, { validUntil: { gte: now } }],
                },
                orderBy: { validFrom: 'desc' },
                take: 1,
                select: { amount: true, currency: true, priceList: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, meta: { total, page: filters.page, limit: filters.limit } };
  }

  private async productWhere(filters: ProductFilterDto | AdminProductFilterDto, admin = false): Promise<Prisma.ProductWhereInput> {
    const categoryIds = filters.categoryId?.length ? await this.hierarchy.descendantIds(filters.categoryId) : undefined;
    return {
      deletedAt: null,
      active: admin ? (filters as AdminProductFilterDto).active : true,
      brandId: filters.brandId,
      laboratoryId: filters.laboratoryId,
      productType: filters.productType,
      requiresMedicationPermission: filters.medicationRequired,
      featured: filters.featured,
      categories: categoryIds ? { some: { categoryId: { in: categoryIds } } } : undefined,
      AND: filters.attributeValueIds?.map((attributeValueId) => ({
        attributes: { some: { attributeValueId } },
      })),
      OR: filters.search
        ? [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { variants: { some: { sku: { contains: filters.search, mode: 'insensitive' } } } },
            { variants: { some: { ean: { contains: filters.search, mode: 'insensitive' } } } },
            { brand: { name: { contains: filters.search, mode: 'insensitive' } } },
            { laboratory: { name: { contains: filters.search, mode: 'insensitive' } } },
          ]
        : undefined,
    };
  }

  findBySlug(slug: string, admin = false) {
    return this.prisma.product.findFirst({
      where: { slug, deletedAt: null, active: admin ? undefined : true },
      relationLoadStrategy: 'join',
      include: productInclude(),
    });
  }

  create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data, include: productInclude() });
  }

  update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data, include: productInclude() });
  }

  createVariant(productId: string, data: Prisma.ProductVariantCreateWithoutProductInput) {
    return this.prisma.productVariant.create({ data: { ...data, product: { connect: { id: productId } } } });
  }

  updateVariant(id: string, data: Prisma.ProductVariantUpdateInput) {
    return this.prisma.productVariant.update({ where: { id }, data });
  }

  findById(id: string) {
    return this.prisma.product.findFirst({ where: { id, deletedAt: null } });
  }

  findVariantById(id: string) {
    return this.prisma.productVariant.findUnique({ where: { id } });
  }

  createMedia(productId: string, data: Prisma.ProductMediaCreateWithoutProductInput) {
    return this.prisma.productMedia.create({ data: { ...data, product: { connect: { id: productId } } } });
  }

  findMediaById(id: string) {
    return this.prisma.productMedia.findUnique({ where: { id } });
  }

  updateMedia(id: string, data: Prisma.ProductMediaUpdateInput) {
    return this.prisma.productMedia.update({ where: { id }, data });
  }

  deleteMedia(id: string) {
    return this.prisma.productMedia.delete({ where: { id } });
  }

}
