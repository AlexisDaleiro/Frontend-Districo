"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const slugify_1 = require("../../common/utils/slugify");
const categories_repository_1 = require("./categories.repository");
let CategoriesService = class CategoriesService {
    constructor(categoriesRepository) {
        this.categoriesRepository = categoriesRepository;
    }
    async findTree() {
        const categories = await this.categoriesRepository.findAll();
        const nodes = new Map(categories.map((category) => [category.id, { ...category, children: [] }]));
        const roots = [];
        for (const node of nodes.values()) {
            const parent = node.parentId ? nodes.get(node.parentId) : undefined;
            if (parent) {
                parent.children.push(node);
            }
            else {
                roots.push(node);
            }
        }
        return roots;
    }
    async create(dto) {
        await this.assertValidParent(dto.parentId);
        return this.categoriesRepository.create({
            name: dto.name,
            slug: dto.slug ?? (0, slugify_1.slugify)(dto.name),
            active: dto.active ?? true,
            parent: dto.parentId ? { connect: { id: dto.parentId } } : undefined,
        });
    }
    async update(id, dto) {
        const category = await this.categoriesRepository.findById(id);
        if (!category || category.deletedAt)
            throw new common_1.NotFoundException('Categoria no encontrada.');
        if (dto.parentId !== undefined)
            await this.assertValidParent(dto.parentId, id);
        return this.categoriesRepository.update(id, {
            name: dto.name,
            slug: dto.slug ?? (dto.name ? (0, slugify_1.slugify)(dto.name) : undefined),
            active: dto.active,
            parent: dto.parentId === null ? { disconnect: true } : dto.parentId ? { connect: { id: dto.parentId } } : undefined,
        });
    }
    async assertValidParent(parentId, categoryId) {
        const visited = new Set(categoryId ? [categoryId] : []);
        let currentId = parentId;
        while (currentId) {
            if (visited.has(currentId))
                throw new common_1.BadRequestException('La jerarquia de categorias no puede tener ciclos.');
            visited.add(currentId);
            const parent = await this.categoriesRepository.findById(currentId);
            if (!parent || parent.deletedAt)
                throw new common_1.BadRequestException('Categoria padre no encontrada.');
            currentId = parent.parentId;
        }
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [categories_repository_1.CategoriesRepository])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map