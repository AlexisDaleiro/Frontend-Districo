import { ContactInquiryStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../catalog/dto/pagination-query.dto';

export class ContactInquiryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ContactInquiryStatus)
  status?: ContactInquiryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
