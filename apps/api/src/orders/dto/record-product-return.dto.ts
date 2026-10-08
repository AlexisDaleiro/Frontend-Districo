import { Type, Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class ProductReturnLineDto {
  @IsString() @MinLength(1) @MaxLength(100)
  orderItemId: string;

  @IsInt() @Min(1) @Max(1000000)
  quantity: number;

  @IsInt() @Min(0) @Max(1000000)
  restockedQuantity: number;
}

export class RecordProductReturnDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ArrayUnique((line: ProductReturnLineDto) => line?.orderItemId)
  @ValidateNested({ each: true }) @Type(() => ProductReturnLineDto)
  items: ProductReturnLineDto[];

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(3) @MaxLength(500)
  reason: string;

  @IsUUID()
  requestId: string;

  @IsOptional() @IsString() @MaxLength(64)
  previewToken?: string;
}
