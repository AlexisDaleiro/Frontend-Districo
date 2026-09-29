import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryIdentity, groupEquivalentCategories } from './category-groups';

type CategoryLink = CategoryIdentity;

@Injectable()
export class CategoryHierarchyService {
  private links?: CategoryLink[];
  private expiresAt = 0;
  private revision = 0;
  private pending?: Promise<CategoryLink[]>;

  constructor(private readonly prisma: PrismaService) {}

  get version() {
    return this.revision;
  }

  remember(links: CategoryLink[], version: number) {
    if (version !== this.revision) return;
    this.links = links.map(({ id, name, parentId }) => ({ id, name, parentId }));
    this.expiresAt = Date.now() + 60_000;
  }

  invalidate() {
    this.revision += 1;
    this.links = undefined;
    this.pending = undefined;
    this.expiresAt = 0;
  }

  async descendantIds(categoryIds: string[]) {
    const links = await this.getLinks();
    const aliases = new Map<string, string[]>();
    for (const group of groupEquivalentCategories(links).values()) {
      const ids = group.map((category) => category.id);
      for (const id of ids) aliases.set(id, ids);
    }
    const ids = new Set(categoryIds);
    let previousSize: number;
    do {
      previousSize = ids.size;
      for (const id of [...ids]) {
        for (const alias of aliases.get(id) ?? []) ids.add(alias);
      }
      for (const category of links) {
        if (category.parentId && ids.has(category.parentId)) ids.add(category.id);
      }
    } while (ids.size !== previousSize);
    return [...ids];
  }

  private getLinks(): Promise<CategoryLink[]> {
    if (this.links && Date.now() < this.expiresAt) return Promise.resolve(this.links);
    if (this.pending) return this.pending;
    const version = this.revision;
    const pending = this.prisma.category.findMany({
      where: { deletedAt: null, active: true },
      select: { id: true, name: true, parentId: true },
    }).then((links) => {
      if (version !== this.revision) return this.getLinks();
      this.remember(links, version);
      return links;
    }).finally(() => {
      if (this.pending === pending) this.pending = undefined;
    });
    this.pending = pending;
    return pending;
  }
}
