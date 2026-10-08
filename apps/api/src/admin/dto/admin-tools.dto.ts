import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../catalog/dto/pagination-query.dto';

export class AdminSearchDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  search: string;
}

export class BulkBaseDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  ids: string[];

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;

  @IsUUID()
  requestId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  previewToken?: string;
}

export class BulkProductActiveDto extends BulkBaseDto {
  @IsBoolean()
  active: boolean;
}

export class BulkProductPricesDto extends BulkBaseDto {
  @IsIn(['PERCENTAGE', 'FIXED'])
  mode: 'PERCENTAGE' | 'FIXED';

  @IsNumber({ maxDecimalPlaces: 2 })
  value: number;
}

export class BulkCustomerSellerDto extends BulkBaseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  salespersonUserId: string;
}

export class BulkHistoryDto extends PaginationQueryDto {
  @IsIn(['catalogo', 'vendedores'])
  feature: 'catalogo' | 'vendedores';
}
