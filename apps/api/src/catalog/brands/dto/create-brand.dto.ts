import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalesLine } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Gran Plus' })
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ enum: SalesLine, nullable: true, description: 'Canal de venta que heredan los productos de la marca.' })
  @IsOptional()
  @IsEnum(SalesLine)
  salesLine?: SalesLine | null;
}
