import { CreateLaboratoryDto } from './dto/create-laboratory.dto';
import { UpdateLaboratoryDto } from './dto/update-laboratory.dto';
import { LaboratoriesRepository } from './laboratories.repository';
export declare class LaboratoriesService {
    private readonly laboratoriesRepository;
    constructor(laboratoriesRepository: LaboratoriesRepository);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        deletedAt: Date | null;
    }[]>;
    create(dto: CreateLaboratoryDto): import(".prisma/client").Prisma.Prisma__LaboratoryClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        deletedAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    update(id: string, dto: UpdateLaboratoryDto): import(".prisma/client").Prisma.Prisma__LaboratoryClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        deletedAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
