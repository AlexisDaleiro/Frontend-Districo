import { AccountStatus, OrderStatus, Role } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../catalog/dto/pagination-query.dto';

export class SearchListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class CustomerListQueryDto extends SearchListQueryDto {
  @IsOptional() @IsString() @MaxLength(100)
  salespersonId?: string;

  @IsOptional() @IsEnum(AccountStatus)
  accountStatus?: AccountStatus;

  @IsOptional() @IsIn(['WITH_DEBT', 'WITHOUT_DEBT'])
  debt?: 'WITH_DEBT' | 'WITHOUT_DEBT';
}

export class StaffListQueryDto extends SearchListQueryDto {
  @IsOptional() @IsIn([Role.ADMIN, Role.SALES, Role.CATALOG, Role.FINANCE, Role.CUSTOM])
  role?: Role;

  @IsOptional() @IsString() @MaxLength(100)
  customRoleId?: string;

  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE', 'PENDING', 'UNVERIFIED'])
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'UNVERIFIED';
}

export class OrderListQueryDto extends SearchListQueryDto {
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
