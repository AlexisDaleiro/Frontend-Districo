import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductFilterDto } from './dto/product-filter.dto';

const productInclude = () =>
  ({
    brand: true,
    laboratory: true,
    categories: { include: { category: true } },
    variants: {
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
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
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: ProductFilterDto) {
    const categoryIds = filters.categoryId ? await this.categoryAndDescendantIds(filters.categoryId) : undefined;
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      active: true,
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

    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: productInclude(),
        orderBy: { name: 'asc' },
        skip,
        take: filters.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, meta: { total, page: filters.page, limit: filters.limit } };
  }

  findBySlug(slug: string) {
    return this.prisma.product.findFirst({
      where: { slug, deletedAt: null, active: true },
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

  private async categoryAndDescendantIds(categoryId: string) {
    const categories = await this.prisma.category.findMany({
      where: { deletedAt: null, active: true },
      select: { id: true, parentId: true },
    });
    const ids = new Set([categoryId]);
    let previousSize: number;
    do {
      previousSize = ids.size;
      for (const category of categories) {
        if (category.parentId && ids.has(category.parentId)) ids.add(category.id);
      }
    } while (ids.size !== previousSize);
    return [...ids];
  }
}
