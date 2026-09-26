import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class CategoriesRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        parentId: string | null;
        deletedAt: Date | null;
    }[]>;
    findById(id: string): Prisma.Prisma__CategoryClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        parentId: string | null;
        deletedAt: Date | null;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    create(data: Prisma.CategoryCreateInput): Prisma.Prisma__CategoryClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        parentId: string | null;
        deletedAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    update(id: string, data: Prisma.CategoryUpdateInput): Prisma.Prisma__CategoryClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        parentId: string | null;
        deletedAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
}
