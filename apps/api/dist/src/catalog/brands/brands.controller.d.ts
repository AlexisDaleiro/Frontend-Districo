import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
export declare class BrandsController {
    private readonly brandsService;
    constructor(brandsService: BrandsService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        deletedAt: Date | null;
    }[]>;
    create(dto: CreateBrandDto): import(".prisma/client").Prisma.Prisma__BrandClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        deletedAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    update(id: string, dto: UpdateBrandDto): import(".prisma/client").Prisma.Prisma__BrandClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        deletedAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
