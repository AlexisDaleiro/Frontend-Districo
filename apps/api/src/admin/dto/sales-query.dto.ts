import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../catalog/dto/pagination-query.dto';

export class SalesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['today', '7d', '30d', '90d', 'custom'])
  period: 'today' | '7d' | '30d' | '90d' | 'custom' = '7d';

  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @IsOptional() @IsIn(['salesperson', 'customer', 'brand'])
  groupBy: 'salesperson' | 'customer' | 'brand' = 'salesperson';

  @IsOptional() @IsString() @MaxLength(100)
  salespersonId?: string;

  @IsOptional() @IsString() @MaxLength(100)
  customerId?: string;

  @IsOptional() @IsString() @MaxLength(100)
  brandId?: string;

  @IsOptional() @IsIn(['UYU', 'USD'])
  currency: 'UYU' | 'USD' = 'UYU';
}
