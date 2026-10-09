import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  @IsOptional()
  @IsBoolean()
  acceptManualReview?: boolean;

  @IsOptional()
  @IsString()
  deliveryAddressId?: string;

  @IsOptional()
  @IsIn(['CASH', 'INSTALLMENTS'])
  paymentMethod?: string;

  @IsOptional()
  @IsInt()
  @IsIn([1, 3, 6])
  paymentTermMonths?: number;
}
