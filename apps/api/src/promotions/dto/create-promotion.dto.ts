import { PromotionMetric, PromotionRewardType, PromotionTargetType, PromotionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class PromotionConditionDto {
  @IsEnum(PromotionTargetType)
  targetType: PromotionTargetType;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  targetIds?: string[];

  @IsOptional()
  @IsEnum(PromotionMetric)
  metric?: PromotionMetric;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;
}

export class PromotionRewardDto {
  @IsEnum(PromotionTargetType)
  targetType: PromotionTargetType;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsEnum(PromotionRewardType)
  rewardType: PromotionRewardType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;
}

export class CreatePromotionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PromotionType)
  type: PromotionType;

  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  combinable?: boolean;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PromotionConditionDto)
  conditions: PromotionConditionDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PromotionRewardDto)
  rewards: PromotionRewardDto[];
}
