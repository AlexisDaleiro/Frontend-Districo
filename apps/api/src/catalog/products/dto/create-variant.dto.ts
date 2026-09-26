import { ApiProperty } from '@nestjs/swagger';
import { UnitOfMeasure } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({ example: 'DIS-DEMO-0001' })
  @IsString()
  @MinLength(3)
  sku: string;

  @IsOptional()
  @IsString()
  ean?: string;

  @ApiProperty({ example: '1 kg' })
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  presentation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsEnum(UnitOfMeasure)
  unitOfMeasure?: UnitOfMeasure;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  saleMultiple?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minimumOrderQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  physicalStock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reservedStock?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  isDemoData?: boolean;
}
