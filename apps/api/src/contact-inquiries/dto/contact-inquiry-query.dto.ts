import { ContactInquiryStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ContactInquiryQueryDto {
  @IsOptional()
  @IsEnum(ContactInquiryStatus)
  status?: ContactInquiryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
