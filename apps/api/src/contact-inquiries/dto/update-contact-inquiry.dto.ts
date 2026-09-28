import { ContactInquiryStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateContactInquiryDto {
  @ApiPropertyOptional({ enum: ContactInquiryStatus })
  @IsOptional()
  @IsEnum(ContactInquiryStatus)
  status?: ContactInquiryStatus;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNote?: string;
}
