import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';

export class CategoryProductsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
