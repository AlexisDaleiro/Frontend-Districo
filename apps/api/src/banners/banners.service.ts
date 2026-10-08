import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BannerStorageService, bannerFileType, MAX_BANNER_BYTES } from './banner-storage.service';
import { SaveBannerDto } from './dto/save-banner.dto';
import { BannerPlacement } from './dto/banner-query.dto';

export type BannerFile = { buffer: Buffer; size: number };
export type BannerFiles = { desktop?: BannerFile[]; mobile?: BannerFile[] };

@Injectable()
export class BannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: BannerStorageService,
  ) {}

  async publicList(placement: BannerPlacement = 'ECOMMERCE') {
    const now = new Date();
    const items = await this.prisma.storeBanner.findMany({
      where: { deletedAt: null, active: true, placement, AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ] },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return items.map((item) => this.present(item));
  }

  async adminList(placement?: BannerPlacement) {
    const items = await this.prisma.storeBanner.findMany({
      where: { deletedAt: null, placement },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return items.map((item) => this.present(item));
  }

  async create(dto: SaveBannerDto, files: BannerFiles, adminId: string) {
    if (!dto.title?.trim() || !dto.actionLabel?.trim() || !dto.href || !dto.alt?.trim()) {
      throw new BadRequestException('Completa titulo, boton, destino y texto alternativo.');
    }
    if (!files.desktop?.[0]) throw new BadRequestException('Adjunta una imagen de escritorio.');
    this.assertDates(dto);
    this.assertDestination(dto.href!, dto.placement ?? 'ECOMMERCE');
    const uploaded: string[] = [];
    try {
      const desktopImagePath = await this.upload(files.desktop[0], 'desktop');
      uploaded.push(desktopImagePath);
      const mobileImagePath = files.mobile?.[0] ? await this.upload(files.mobile[0], 'mobile') : null;
      if (mobileImagePath) uploaded.push(mobileImagePath);
      const banner = await this.prisma.$transaction(async (tx) => {
        const created = await tx.storeBanner.create({ data: {
          title: dto.title!.trim(), subtitle: dto.subtitle?.trim() || null,
          actionLabel: dto.actionLabel!.trim(), href: dto.href!, alt: dto.alt!.trim(),
          desktopImagePath, mobileImagePath, position: dto.position ?? 0, placement: dto.placement ?? 'ECOMMERCE',
          active: dto.active ?? true, startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        } });
        await tx.auditLog.create({ data: { action: 'STORE_BANNER_CREATED', entityType: 'StoreBanner', entityId: created.id, userId: adminId } });
        return created;
      });
      return this.present(banner);
    } catch (error) {
      await Promise.all(uploaded.map((path) => this.storage.remove(path)));
      throw error;
    }
  }

  async update(id: string, dto: SaveBannerDto, files: BannerFiles, adminId: string) {
    const existing = await this.prisma.storeBanner.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Banner no encontrado.');
    this.assertDates(dto, existing.startsAt, existing.endsAt);
    this.assertDestination(dto.href ?? existing.href, dto.placement ?? existing.placement as BannerPlacement);
    const uploaded: string[] = [];
    try {
      const desktopImagePath = files.desktop?.[0] ? await this.upload(files.desktop[0], 'desktop') : undefined;
      if (desktopImagePath) uploaded.push(desktopImagePath);
      const mobileImagePath = files.mobile?.[0] ? await this.upload(files.mobile[0], 'mobile') : undefined;
      if (mobileImagePath) uploaded.push(mobileImagePath);
      const banner = await this.prisma.$transaction(async (tx) => {
        const changed = await tx.storeBanner.update({ where: { id }, data: {
          title: dto.title?.trim(), subtitle: dto.subtitle === undefined ? undefined : dto.subtitle.trim() || null,
          actionLabel: dto.actionLabel?.trim(), href: dto.href, alt: dto.alt?.trim(),
          position: dto.position, active: dto.active, placement: dto.placement,
          startsAt: dto.startsAt === undefined ? undefined : dto.startsAt === null ? null : new Date(dto.startsAt),
          endsAt: dto.endsAt === undefined ? undefined : dto.endsAt === null ? null : new Date(dto.endsAt),
          desktopImagePath, mobileImagePath,
        } });
        await tx.auditLog.create({ data: { action: 'STORE_BANNER_UPDATED', entityType: 'StoreBanner', entityId: id, userId: adminId } });
        return changed;
      });
      if (desktopImagePath) await this.storage.remove(existing.desktopImagePath);
      if (mobileImagePath && existing.mobileImagePath) await this.storage.remove(existing.mobileImagePath);
      return this.present(banner);
    } catch (error) {
      await Promise.all(uploaded.map((path) => this.storage.remove(path)));
      throw error;
    }
  }

  async remove(id: string, adminId: string) {
    const existing = await this.prisma.storeBanner.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Banner no encontrado.');
    await this.prisma.$transaction(async (tx) => {
      await tx.storeBanner.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
      await tx.auditLog.create({ data: { action: 'STORE_BANNER_DELETED', entityType: 'StoreBanner', entityId: id, userId: adminId } });
    });
    return { success: true };
  }

  private async upload(file: BannerFile, label: string) {
    if (!file.buffer?.length || file.size > MAX_BANNER_BYTES || file.buffer.length > MAX_BANNER_BYTES) {
      throw new BadRequestException('La imagen debe pesar entre 1 byte y 5 MB.');
    }
    const kind = bannerFileType(file.buffer);
    const path = `banners/${randomUUID()}-${label}.${kind.extension}`;
    await this.storage.upload(path, file.buffer, kind.mimeType);
    return path;
  }

  private assertDates(dto: SaveBannerDto, currentStart?: Date | null, currentEnd?: Date | null) {
    const start = dto.startsAt === null ? null : dto.startsAt ? new Date(dto.startsAt) : currentStart;
    const end = dto.endsAt === null ? null : dto.endsAt ? new Date(dto.endsAt) : currentEnd;
    if (start && end && end < start) throw new BadRequestException('La fecha final debe ser posterior al inicio.');
  }

  private assertDestination(href: string, placement: BannerPlacement) {
    if (!/^\/(?!\/)[^\\\s]*$/.test(href) || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(href)) {
      throw new BadRequestException('El destino debe ser una ruta interna del sitio.');
    }
    const path = new URL(href, 'https://districo.invalid').pathname;
    if (placement === 'ECOMMERCE' && !/^\/tienda(?:$|\/)/.test(path)) {
      throw new BadRequestException('Un banner de ecommerce debe enlazar a la tienda.');
    }
  }

  private present(banner: { desktopImagePath: string; mobileImagePath: string | null } & Record<string, unknown>) {
    return {
      ...banner,
      imageUrl: this.storage.url(banner.desktopImagePath),
      mobileImageUrl: banner.mobileImagePath ? this.storage.url(banner.mobileImagePath) : null,
    };
  }
}
