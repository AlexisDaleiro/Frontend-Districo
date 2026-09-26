import { AttributeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class AttributesRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<({
        values: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            attributeId: string;
            value: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        type: import(".prisma/client").$Enums.AttributeType;
    })[]>;
    createDefinition(data: {
        name: string;
        slug: string;
        type: AttributeType;
    }): import(".prisma/client").Prisma.Prisma__AttributeDefinitionClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        type: import(".prisma/client").$Enums.AttributeType;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    createValue(attributeId: string, data: {
        value: string;
        slug: string;
    }): import(".prisma/client").Prisma.Prisma__AttributeValueClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        attributeId: string;
        value: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
