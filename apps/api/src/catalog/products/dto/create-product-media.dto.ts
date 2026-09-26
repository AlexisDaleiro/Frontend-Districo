import { ApiProperty } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateProductMediaDto {
  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @ApiProperty({ example: 'https://example.com/product.png' })
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
