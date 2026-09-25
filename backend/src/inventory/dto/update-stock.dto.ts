import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  physicalStock: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reservedStock?: number;
}
