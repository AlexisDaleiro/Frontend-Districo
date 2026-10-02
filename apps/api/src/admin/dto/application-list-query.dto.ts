import { CustomerApplicationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../catalog/dto/pagination-query.dto';

export class ApplicationListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(CustomerApplicationStatus)
  status?: CustomerApplicationStatus;
}
