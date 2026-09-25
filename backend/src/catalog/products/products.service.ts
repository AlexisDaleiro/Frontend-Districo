import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Permission, ProductSource, ProductType, Role, UnitOfMeasure } from '@prisma/client';
import { JwtUser } from '../../common/types/jwt-user.type';
import { slugify } from '../../common/utils/slugify';
import { CreateProductMediaDto } from './dto/create-product-media.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { UpdateProductMediaDto } from './dto/update-product-media.dto';
import { ProductsRepository } from './products.repository';

type CatalogProduct = NonNullable<Awaited<ReturnType<ProductsRepository['findBySlug']>>>;

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async findMany(filters: ProductFilterDto, user?: JwtUser | null) {
    const result = await this.productsRepository.findMany(filters);
    return { ...result, items: result.items.map((product) => this.toPublicProduct(product, user)) };
  }

  async findBySlug(slug: string, user?: JwtUser | null) {
    const product = await this.productsRepository.findBySlug(slug);
    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }
    return this.toPublicProduct(product, user);
  }

  create(dto: CreateProductDto) {
    return this.productsRepository.create({
      name: dto.name,
      slug: dto.slug ?? slugify(dto.name),
      shortDescription: dto.shortDescription,
      description: dto.description,
      productType: dto.productType ?? ProductType.OTHER,
      source: dto.source ?? ProductSource.DISTRICO,
      requiresMedicationPermission: dto.requiresMedicationPermission ?? false,
      active: dto.active ?? true,
      featured: dto.featured ?? false,
      newProduct: dto.newProduct ?? false,
      tags: dto.tags ?? [],
      brand: dto.brandId ? { connect: { id: dto.brandId } } : undefined,
      laboratory: dto.laboratoryId ? { connect: { id: dto.laboratoryId } } : undefined,
      categories: dto.categoryIds?.length
        ? { create: dto.categoryIds.map((categoryId) => ({ category: { connect: { id: categoryId } } })) }
        : undefined,
      attributes: dto.attributeValueIds?.length
        ? { create: dto.attributeValueIds.map((attributeValueId) => ({ attributeValue: { connect: { id: attributeValueId } } })) }
        : undefined,
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.assertProductExists(id);
    return this.productsRepository.update(id, {
      name: dto.name,
      slug: dto.slug ?? (dto.name ? slugify(dto.name) : undefined),
      shortDescription: dto.shortDescription,
      description: dto.description,
      productType: dto.productType,
      source: dto.source,
      requiresMedicationPermission: dto.requiresMedicationPermission,
      active: dto.active,
      featured: dto.featured,
      newProduct: dto.newProduct,
      tags: dto.tags,
      brand: dto.brandId ? { connect: { id: dto.brandId } } : undefined,
      laboratory: dto.laboratoryId ? { connect: { id: dto.laboratoryId } } : undefined,
      categories: dto.categoryIds ? { deleteMany: {}, create: dto.categoryIds.map((categoryId) => ({ categoryId })) } : undefined,
      attributes: dto.attributeValueIds ? { deleteMany: {}, create: dto.attributeValueIds.map((attributeValueId) => ({ attributeValueId })) } : undefined,
    });
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    await this.assertProductExists(productId);
    return this.productsRepository.createVariant(productId, {
      sku: dto.sku,
      ean: dto.ean,
      name: dto.name,
      presentation: dto.presentation,
      weight: dto.weight,
      unitOfMeasure: dto.unitOfMeasure ?? UnitOfMeasure.UNIT,
      saleMultiple: dto.saleMultiple ?? 1,
      minimumOrderQuantity: dto.minimumOrderQuantity ?? dto.saleMultiple ?? 1,
      physicalStock: dto.physicalStock ?? 0,
      reservedStock: dto.reservedStock ?? 0,
      active: dto.active ?? true,
      isDemoData: dto.isDemoData ?? false,
    });
  }

  async updateVariant(id: string, dto: UpdateVariantDto) {
    const variant = await this.productsRepository.findVariantById(id);
    if (!variant || variant.deletedAt) throw new NotFoundException('Variante no encontrada.');
    return this.productsRepository.updateVariant(id, dto);
  }

  async createMedia(productId: string, dto: CreateProductMediaDto) {
    await this.assertProductExists(productId);
    if (dto.variantId) {
      const variant = await this.productsRepository.findVariantById(dto.variantId);
      if (!variant || variant.productId !== productId || variant.deletedAt) {
        throw new BadRequestException('La variante no pertenece al producto.');
      }
    }
    return this.productsRepository.createMedia(productId, {
      variant: dto.variantId ? { connect: { id: dto.variantId } } : undefined,
      type: dto.type ?? 'IMAGE',
      url: dto.url,
      alt: dto.alt,
      position: dto.position ?? 0,
      isPrimary: dto.isPrimary ?? false,
    });
  }

  async updateMedia(id: string, dto: UpdateProductMediaDto) {
    const media = await this.productsRepository.findMediaById(id);
    if (!media) throw new NotFoundException('Imagen o video no encontrado.');
    if (dto.variantId) {
      const variant = await this.productsRepository.findVariantById(dto.variantId);
      if (!variant || variant.productId !== media.productId || variant.deletedAt) {
        throw new BadRequestException('La variante no pertenece al producto.');
      }
    }
    return this.productsRepository.updateMedia(id, {
      variant: dto.variantId ? { connect: { id: dto.variantId } } : undefined,
      type: dto.type,
      url: dto.url,
      alt: dto.alt,
      position: dto.position,
      isPrimary: dto.isPrimary,
    });
  }

  async deleteMedia(id: string) {
    const media = await this.productsRepository.findMediaById(id);
    if (!media) throw new NotFoundException('Imagen o video no encontrado.');
    await this.productsRepository.deleteMedia(id);
    return { success: true };
  }

  private async assertProductExists(id: string) {
    const product = await this.productsRepository.findById(id);
    if (!product) throw new NotFoundException('Producto no encontrado.');
  }

  private toPublicProduct(product: CatalogProduct, user?: JwtUser | null) {
    const { source: _source, deletedAt: _deletedAt, ...publicProduct } = product;
    const canViewPrice = this.canViewPrice(product.requiresMedicationPermission, user);
    return {
      ...publicProduct,
      medicationRestricted: product.requiresMedicationPermission && !this.canBuyMedication(user),
      variants: product.variants.map(({ physicalStock, reservedStock, isDemoData: _isDemoData, deletedAt: _variantDeletedAt, prices, ...variant }) => {
        const currentPrice = prices[0];
        const availableStock = physicalStock - reservedStock;
        return {
          ...variant,
          availableStock,
          stockStatus: availableStock > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
          price: canViewPrice && currentPrice
            ? {
                amount: Number(currentPrice.amount),
                currency: currentPrice.currency,
                priceList: currentPrice.priceList.name,
              }
            : undefined,
        };
      }),
    };
  }

  private canViewPrice(requiresMedicationPermission: boolean, user?: JwtUser | null) {
    if (!user) return false;
    if (user.role === Role.ADMIN) return true;
    if (!user.permissions.includes(Permission.CAN_VIEW_PRICES)) return false;
    if (requiresMedicationPermission && !this.canBuyMedication(user)) return false;
    return true;
  }

  private canBuyMedication(user?: JwtUser | null) {
    return Boolean(user?.role === Role.ADMIN || user?.permissions.includes(Permission.CAN_BUY_MEDICATIONS));
  }
}
