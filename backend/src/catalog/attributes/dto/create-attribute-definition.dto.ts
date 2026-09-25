import { ApiProperty } from '@nestjs/swagger';
import { AttributeType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAttributeDefinitionDto {
  @ApiProperty({ example: 'Especie' })
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsEnum(AttributeType)
  type?: AttributeType;
}
