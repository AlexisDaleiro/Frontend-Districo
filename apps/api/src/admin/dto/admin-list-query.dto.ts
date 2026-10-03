import { OrderStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../catalog/dto/pagination-query.dto';

export class CustomerListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class OrderListQueryDto extends CustomerListQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customer?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(['PENDING', 'PARTIAL', 'PAID', 'CREDITED'])
  paymentStatus?: 'PENDING' | 'PARTIAL' | 'PAID' | 'CREDITED';
}
