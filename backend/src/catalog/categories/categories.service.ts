import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';
import { slugify } from '../../common/utils/slugify';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type CategoryNode = Category & { children: CategoryNode[] };

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async findTree() {
    const categories = await this.categoriesRepository.findAll();
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

  async create(dto: CreateCategoryDto) {
    await this.assertValidParent(dto.parentId);
    return this.categoriesRepository.create({
      name: dto.name,
      slug: dto.slug ?? slugify(dto.name),
      active: dto.active ?? true,
      parent: dto.parentId ? { connect: { id: dto.parentId } } : undefined,
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoriesRepository.findById(id);
    if (!category || category.deletedAt) throw new NotFoundException('Categoria no encontrada.');
    if (dto.parentId !== undefined) await this.assertValidParent(dto.parentId, id);
    return this.categoriesRepository.update(id, {
      name: dto.name,
      slug: dto.slug ?? (dto.name ? slugify(dto.name) : undefined),
      active: dto.active,
      parent: dto.parentId === null ? { disconnect: true } : dto.parentId ? { connect: { id: dto.parentId } } : undefined,
    });
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
}
