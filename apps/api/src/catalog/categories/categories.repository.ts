import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      where: { OR: [{ deletedAt: null }, { mergedIntoId: { not: null } }] },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  async organizationNames() {
    const [brands, laboratories] = await Promise.all([
      this.prisma.brand.findMany({ where: { deletedAt: null }, select: { name: true } }),
      this.prisma.laboratory.findMany({ where: { deletedAt: null }, select: { name: true } }),
    ]);
    return [...brands, ...laboratories].map((item) => item.name);
  }

  create(data: Prisma.CategoryCreateInput) {
    return this.prisma.category.create({ data });
  }

  update(id: string, data: Prisma.CategoryUpdateInput) {
    return this.prisma.category.update({ where: { id }, data });
  }

  async products(categoryId: string, search: string | undefined, linked: boolean, page: number, limit: number) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      categories: linked ? { some: { categoryId } } : { none: { categoryId } },
      OR: search ? [
        { name: { contains: search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
      ] : undefined,
    };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: { id: true, name: true, slug: true, active: true, brand: { select: { name: true } } },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, meta: { total, page, limit } };
  }

  productExists(id: string) {
    return this.prisma.product.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  linkProduct(categoryId: string, productId: string) {
    return this.prisma.productCategory.upsert({
      where: { productId_categoryId: { productId, categoryId } },
      create: { productId, categoryId },
      update: {},
    });
  }

  unlinkProduct(categoryId: string, productId: string) {
    return this.prisma.productCategory.deleteMany({ where: { categoryId, productId } });
  }
}
