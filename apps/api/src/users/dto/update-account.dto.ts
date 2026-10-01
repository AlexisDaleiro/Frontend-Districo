import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  businessName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  legalName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  rut?: string;
}
