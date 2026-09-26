import { AttributeType } from '@prisma/client';
export declare class CreateAttributeDefinitionDto {
    name: string;
    slug?: string;
    type?: AttributeType;
}
