import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

export class CustomerDocumentInputDto {
  @IsString()
  type: string;

  @IsString()
  fileUrl: string;

  @IsString()
  originalName: string;

  @IsString()
  mimeType: string;
}

export class CreateApplicationDto {
  @ApiProperty()
  @IsString()
  businessName: string;

  @IsString()
  legalName: string;

  @IsString()
  rut: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsBoolean()
  requestedMedicationPermission?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CustomerDocumentInputDto)
  documents?: CustomerDocumentInputDto[];
}
