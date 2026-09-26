import { AttributesService } from './attributes.service';
import { CreateAttributeDefinitionDto } from './dto/create-attribute-definition.dto';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';
export declare class AttributesController {
    private readonly attributesService;
    constructor(attributesService: AttributesService);
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
    createDefinition(dto: CreateAttributeDefinitionDto): import(".prisma/client").Prisma.Prisma__AttributeDefinitionClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        type: import(".prisma/client").$Enums.AttributeType;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    createValue(attributeId: string, dto: CreateAttributeValueDto): import(".prisma/client").Prisma.Prisma__AttributeValueClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        attributeId: string;
        value: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
