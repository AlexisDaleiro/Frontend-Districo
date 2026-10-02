import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ProductFilterDto } from './product-filter.dto';

export class AdminProductFilterDto extends ProductFilterDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
  @IsBoolean()
  active?: boolean;
}
