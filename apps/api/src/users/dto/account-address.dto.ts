import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAccountAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;
}

export class UpdateAccountAddressDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;
}
