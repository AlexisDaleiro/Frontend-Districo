import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findTree(): Promise<({
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        parentId: string | null;
        deletedAt: Date | null;
    } & {
        children: ({
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            active: boolean;
            slug: string;
            parentId: string | null;
            deletedAt: Date | null;
        } & any)[];
    })[]>;
    create(dto: CreateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        parentId: string | null;
        deletedAt: Date | null;
    }>;
    update(id: string, dto: UpdateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        parentId: string | null;
        deletedAt: Date | null;
    }>;
}
