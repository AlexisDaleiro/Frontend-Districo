import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { BannerStorageService, bannerFileType, MAX_BANNER_BYTES } from '../../banners/banner-storage.service';
import { PrismaService } from '../../prisma/prisma.service';

type ImageFile = { buffer: Buffer; size: number; originalname: string };
type LogoKind = 'brands' | 'laboratories';

@Injectable()
export class CatalogImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: BannerStorageService,
  ) {}

  private imageType(file: ImageFile | undefined) {
    if (!file?.buffer?.length || file.size > MAX_BANNER_BYTES) {
      throw new BadRequestException('Cada imagen debe ser PNG, JPG o WebP y pesar menos de 5 MB.');
    }
    return bannerFileType(file.buffer);
  }

  private async removeOwned(url: string | null | undefined, prefix: string) {
    if (!url?.includes('/storage/v1/object/public/')) return;
    const base = this.storage.url(`${prefix}/`);
    if (url.startsWith(base)) await this.storage.remove(`${prefix}/${url.slice(base.length)}`);
  }

  async uploadProductImages(productId: string, files: ImageFile[] | undefined) {
    if (!files?.length || files.length > 8) throw new BadRequestException('Adjunta entre 1 y 8 imagenes por carga.');
    const types = files.map((file) => this.imageType(file));
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new NotFoundException('Producto no encontrado.');
    const existing = await this.prisma.productMedia.findMany({ where: { productId, type: MediaType.IMAGE }, select: { position: true, isPrimary: true } });
    const start = Math.max(-1, ...existing.map((media) => media.position)) + 1;
    const paths = types.map((type) => `products/${productId}/${randomUUID()}.${type.extension}`);
    try {
      const uploads = await Promise.allSettled(paths.map((path, index) => this.storage.upload(path, files[index].buffer, types[index].mimeType)));
      const failed = uploads.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') throw failed.reason;
      return await this.prisma.$transaction(async (tx) => {
        const created = [];
        for (let index = 0; index < files.length; index++) {
          created.push(await tx.productMedia.create({ data: {
            productId,
            type: MediaType.IMAGE,
            url: this.storage.url(paths[index]),
            alt: product.name,
            position: start + index,
            isPrimary: !existing.some((media) => media.isPrimary) && index === 0,
          } }));
        }
        return created;
      });
    } catch (error) {
      await Promise.all(paths.map((path) => this.storage.remove(path)));
      throw error;
    }
  }

  async removeProductImage(url: string, productId: string) {
    await this.removeOwned(url, `products/${productId}`);
  }

  async uploadLogo(kind: LogoKind, id: string, file: ImageFile | undefined) {
    const type = this.imageType(file);
    const current = kind === 'brands'
      ? await this.prisma.brand.findFirst({ where: { id, deletedAt: null } })
      : await this.prisma.laboratory.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw new NotFoundException('Marca o laboratorio no encontrado.');
    const path = `${kind}/${id}/${randomUUID()}.${type.extension}`;
    await this.storage.upload(path, file!.buffer, type.mimeType);
    try {
      const updated = kind === 'brands'
        ? await this.prisma.brand.update({ where: { id }, data: { imageUrl: this.storage.url(path) } })
        : await this.prisma.laboratory.update({ where: { id }, data: { imageUrl: this.storage.url(path) } });
      await this.removeOwned(current.imageUrl, `${kind}/${id}`);
      return updated;
    } catch (error) {
      await this.storage.remove(path);
      throw error;
    }
  }

  async removeLogo(kind: LogoKind, id: string) {
    const current = kind === 'brands'
      ? await this.prisma.brand.findFirst({ where: { id, deletedAt: null } })
      : await this.prisma.laboratory.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw new NotFoundException('Marca o laboratorio no encontrado.');
    const updated = kind === 'brands'
      ? await this.prisma.brand.update({ where: { id }, data: { imageUrl: null } })
      : await this.prisma.laboratory.update({ where: { id }, data: { imageUrl: null } });
    await this.removeOwned(current.imageUrl, `${kind}/${id}`);
    return updated;
  }
}
