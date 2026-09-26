import { PromotionMetric, PromotionRewardType, PromotionTargetType, PromotionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class PromotionConditionDto {
  @IsEnum(PromotionTargetType)
  targetType: PromotionTargetType;

  @IsOptional()
  @IsString()
  targetId?: string;

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

  @ValidateNested({ each: true })
  @Type(() => PromotionConditionDto)
  conditions: PromotionConditionDto[];

  @ValidateNested({ each: true })
  @Type(() => PromotionRewardDto)
  rewards: PromotionRewardDto[];
}
