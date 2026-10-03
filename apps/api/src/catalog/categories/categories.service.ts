import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';
import { slugify } from '../../common/utils/slugify';
import { CategoriesRepository } from './categories.repository';
import { CategoryHierarchyService } from './category-hierarchy.service';
import { groupEquivalentCategories, normalizedCategoryName } from './category-groups';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryProductsQueryDto } from './dto/category-products-query.dto';

type CategoryNode = Category & { children: CategoryNode[] };
type CatalogCategoryNode = Category & { aliasIds: string[]; children: CatalogCategoryNode[] };

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly hierarchy: CategoryHierarchyService,
  ) {}

  async findTree() {
    const categories = this.visibleCategories(await this.categoriesRepository.findAll());
    const nodes = new Map(categories.map((category) => [category.id, { ...category, children: [] as CategoryNode[] }]));
    const roots: CategoryNode[] = [];

    for (const node of nodes.values()) {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async findCatalogTree() {
    const allCategories = await this.categoriesRepository.findAll();
    const categories = this.visibleCategories(allCategories);
    const groups = groupEquivalentCategories(categories);
    const canonicalId = new Map<string, string>();
    const aliasIds = new Map<string, string[]>();
    const representatives: Category[] = [];
    for (const group of groups.values()) {
      const representative = [...group].sort((a, b) =>
        a.slug.localeCompare(b.slug) || a.id.localeCompare(b.id))[0];
      representatives.push(representative);
      aliasIds.set(representative.id, group.map((category) => category.id));
      for (const category of group) canonicalId.set(category.id, representative.id);
    }
    for (const category of allCategories) {
      if (!category.mergedIntoId) continue;
      const current = aliasIds.get(category.mergedIntoId);
      if (current) current.push(category.id);
    }

    const nodes = new Map(representatives.map((category) => {
      const parentId = category.parentId ? canonicalId.get(category.parentId) ?? null : null;
      return [category.id, {
        ...category,
        parentId,
        aliasIds: aliasIds.get(category.id) ?? [category.id],
        children: [] as CatalogCategoryNode[],
      }] as const;
    }));
    const roots: CatalogCategoryNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    const sort = (items: CatalogCategoryNode[]) => {
      items.sort((a, b) => a.name.localeCompare(b.name, 'es') || a.id.localeCompare(b.id));
      for (const item of items) sort(item.children);
    };
    sort(roots);
    return roots;
  }

  async findAdmin() {
    return (await this.categoriesRepository.findAll()).filter((category) => !category.deletedAt);
  }

  async products(id: string, query: CategoryProductsQueryDto, linked = true) {
    await this.assertCategoryExists(id);
    return this.categoriesRepository.products(id, query.search?.trim(), linked, query.page, query.limit);
  }

  async linkProduct(id: string, productId: string) {
    await this.assertCategoryExists(id);
    if (!await this.categoriesRepository.productExists(productId)) throw new NotFoundException('Producto no encontrado.');
    await this.categoriesRepository.linkProduct(id, productId);
    return { linked: true };
  }

  async unlinkProduct(id: string, productId: string) {
    await this.assertCategoryExists(id);
    await this.categoriesRepository.unlinkProduct(id, productId);
    return { removed: true };
  }

  async create(dto: CreateCategoryDto) {
    await this.assertValidParent(dto.parentId);
    await this.assertUniqueSibling(dto.name, dto.parentId ?? null);
    const category = await this.categoriesRepository.create({
      name: dto.name,
      slug: dto.slug ?? slugify(dto.name),
      active: dto.active ?? true,
      parent: dto.parentId ? { connect: { id: dto.parentId } } : undefined,
    });
    this.hierarchy.invalidate();
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoriesRepository.findById(id);
    if (!category || category.deletedAt) throw new NotFoundException('Categoria no encontrada.');
    if (dto.parentId !== undefined) await this.assertValidParent(dto.parentId, id);
    if (dto.name !== undefined || dto.parentId !== undefined) {
      await this.assertUniqueSibling(dto.name ?? category.name, dto.parentId === undefined ? category.parentId : dto.parentId, id);
    }
    const updated = await this.categoriesRepository.update(id, {
      name: dto.name,
      slug: dto.slug ?? (dto.name ? slugify(dto.name) : undefined),
      active: dto.active,
      parent: dto.parentId === null ? { disconnect: true } : dto.parentId ? { connect: { id: dto.parentId } } : undefined,
    });
    this.hierarchy.invalidate();
    return updated;
  }

  private async assertCategoryExists(id: string) {
    const category = await this.categoriesRepository.findById(id);
    if (!category || category.deletedAt) throw new NotFoundException('Categoria no encontrada.');
  }

  private async assertValidParent(parentId?: string | null, categoryId?: string) {
    const visited = new Set(categoryId ? [categoryId] : []);
    let currentId = parentId;
    while (currentId) {
      if (visited.has(currentId)) throw new BadRequestException('La jerarquia de categorias no puede tener ciclos.');
      visited.add(currentId);
      const parent = await this.categoriesRepository.findById(currentId);
      if (!parent || parent.deletedAt) throw new BadRequestException('Categoria padre no encontrada.');
      currentId = parent.parentId;
    }
  }

  private async assertUniqueSibling(name: string, parentId: string | null, excludeId?: string) {
    const normalized = normalizedCategoryName(name);
    const [siblings, organizations] = await Promise.all([
      this.categoriesRepository.findAll(), this.categoriesRepository.organizationNames(),
    ]);
    if (normalized === 'laboratorios' || normalized === 'boheringer ingelheim' ||
      organizations.some((item) => normalizedCategoryName(item) === normalized)) {
      throw new BadRequestException('Ese nombre corresponde a una marca o laboratorio. Usá su sección específica.');
    }
    if (siblings.some((item) => !item.deletedAt && item.id !== excludeId && item.parentId === parentId && normalizedCategoryName(item.name) === normalized)) {
      throw new BadRequestException('Ya existe una categoria con ese nombre en este nivel.');
    }
  }

  private visibleCategories(categories: Category[]) {
    const byId = new Map(categories.map((category) => [category.id, category]));
    const isVisible = (category: Category, visited = new Set<string>()): boolean => {
      if (category.deletedAt || category.active === false || visited.has(category.id)) return false;
      visited.add(category.id);
      if (!category.parentId) return true;
      const parent = byId.get(category.parentId);
      return !!parent && isVisible(parent, visited);
    };
    return categories.filter((category) => isVisible(category));
  }
}
