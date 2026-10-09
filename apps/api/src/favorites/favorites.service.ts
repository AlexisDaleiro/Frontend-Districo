import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../catalog/products/products.service';
import { JwtUser } from '../common/types/jwt-user.type';
import { SearchListQueryDto } from '../admin/dto/admin-list-query.dto';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService, private readonly products: ProductsService) {}

  private assertCustomer(user: JwtUser) {
    if (user.role !== Role.CLIENT || !user.customerAccountId) throw new ForbiddenException('Los favoritos son exclusivos de clientes.');
  }

  list(user: JwtUser, query: SearchListQueryDto) {
    this.assertCustomer(user);
    return this.products.findFavorites(user, query);
  }

  async ids(user: JwtUser) {
    this.assertCustomer(user);
    const favorites = await this.prisma.productFavorite.findMany({ where: { userId: user.sub, product: { active: true, deletedAt: null } }, select: { productId: true } });
    return favorites.map((favorite) => favorite.productId);
  }

  async add(user: JwtUser, productId: string) {
    this.assertCustomer(user);
    if (!await this.prisma.product.findFirst({ where: { id: productId, active: true, deletedAt: null }, select: { id: true } })) throw new NotFoundException('Producto no disponible.');
    await this.prisma.productFavorite.upsert({ where: { userId_productId: { userId: user.sub, productId } }, create: { userId: user.sub, productId }, update: {} });
    return { productId, favorite: true };
  }

  async remove(user: JwtUser, productId: string) {
    this.assertCustomer(user);
    await this.prisma.productFavorite.deleteMany({ where: { userId: user.sub, productId } });
    return { productId, favorite: false };
  }
}
