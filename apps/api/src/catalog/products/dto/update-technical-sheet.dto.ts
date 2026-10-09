import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';

export class TechnicalBlockDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(50000)
  html?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(30000)
  text?: string;
}

export class ProductBenefitDto {
  @IsString()
  @MaxLength(40)
  icon: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  label: string;
}

export class UpdateTechnicalSheetDto {
  @IsInt()
  @Min(0)
  @Max(2147483646)
  revision: number;

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TechnicalBlockDto)
  technical: TechnicalBlockDto[];

  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ProductBenefitDto)
  benefits: ProductBenefitDto[];
}
