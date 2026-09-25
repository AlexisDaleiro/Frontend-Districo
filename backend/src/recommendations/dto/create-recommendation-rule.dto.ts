import { RecommendationTriggerType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class RecommendationProductDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateRecommendationRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsEnum(RecommendationTriggerType)
  triggerType: RecommendationTriggerType;

  @IsString()
  triggerId: string;

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
  @Type(() => RecommendationProductDto)
  products: RecommendationProductDto[];
}
