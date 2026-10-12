import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
export const performanceNames = [
  "LCP",
  "INP",
  "CLS",
  "FCP",
  "TTFB",
  "NAVIGATION",
  "DATA_READY",
  "API",
  "IMAGE",
] as const;
export const performancePages = [
  "HOME",
  "CATALOG",
  "PRODUCT",
  "CATEGORY",
  "BRANDS",
  "CART",
  "CHECKOUT",
  "ACCOUNT",
  "ORDERS",
  "LOGIN",
  "REGISTER",
  "ADMIN",
  "INSTITUTIONAL",
  "JOBS",
  "OTHER",
] as const;
export class PerformanceSampleDto {
  @IsUUID() id!: string;
  @IsInt() @Min(1) @Max(10000) sequence!: number;
  @IsIn(performanceNames) name!: (typeof performanceNames)[number];
  @IsNumber() @Min(0) @Max(180000) value!: number;
  @IsIn(performancePages) page!: string;
  @IsIn([
    "PAGE",
    "CATALOG",
    "PRODUCT",
    "TAXONOMY",
    "ACCOUNT",
    "ORDERS",
    "ADMIN",
    "OTHER",
    "LOCAL_IMAGE",
    "EXTERNAL_IMAGE",
  ])
  target!: string;
  @IsIn(["DOCUMENT", "SOFT", "RESTORE"]) phase!: string;
  @IsIn(["UNKNOWN", "NETWORK", "CACHE"]) cache!: string;
  @IsIn(["OK", "ERROR"]) outcome!: string;
}
export class PerformanceBatchDto {
  @IsIn([true]) consent!: boolean;
  @IsUUID() viewId!: string;
  @IsIn(["MOBILE", "DESKTOP"]) device!: string;
  @IsIn(["FIRST", "RETURNING", "UNKNOWN"]) visit!: string;
  @IsIn(["PRODUCTION", "LOCAL"]) environment!: string;
  @IsString() @Matches(/^(?:[a-f0-9]{7,40}|unknown)$/i) release!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique((sample: PerformanceSampleDto) => sample.id)
  @ValidateNested({ each: true })
  @Type(() => PerformanceSampleDto)
  samples!: PerformanceSampleDto[];
}
export class PerformanceQueryDto {
  @IsOptional() @IsDateString({ strict: true }) dateFrom?: string;
  @IsOptional() @IsDateString({ strict: true }) dateTo?: string;
  @IsIn(["PRODUCTION", "LOCAL"]) environment: string = "PRODUCTION";
  @IsOptional() @IsIn(["MOBILE", "DESKTOP"]) device?: string;
  @IsOptional() @IsIn(["FIRST", "RETURNING", "UNKNOWN"]) visit?: string;
  @IsOptional() @IsIn(performancePages) pageGroup?: string;
  @IsOptional()
  @IsString()
  @Matches(/^(?:[a-f0-9]{7,40}|unknown)$/i)
  release?: string;
}
