import { RecommendationTriggerType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class RecommendationProductDto {
  @IsString()
  @MinLength(1) @MaxLength(100)
  productId: string;

  @IsOptional()
  @IsString()
  @MinLength(1) @MaxLength(100)
  variantId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateRecommendationRuleDto {
  @IsString()
  @MinLength(2) @MaxLength(120)
  name: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsEnum(RecommendationTriggerType)
  triggerType: RecommendationTriggerType;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(100)
  triggerId?: string;

  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ArrayUnique()
  @IsString({ each: true }) @MinLength(1, { each: true }) @MaxLength(100, { each: true })
  triggerIds?: string[];

  @IsOptional() @IsEnum(RecommendationTriggerType)
  targetType?: RecommendationTriggerType;

  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ArrayUnique()
  @IsString({ each: true }) @MinLength(1, { each: true }) @MaxLength(100, { each: true })
  targetIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minimumQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumCartAmount?: number;

  @ValidateNested({ each: true })
  @IsOptional() @IsArray() @ArrayMaxSize(100)
  @Type(() => RecommendationProductDto)
  products?: RecommendationProductDto[];
}
