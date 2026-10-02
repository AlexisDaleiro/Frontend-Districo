import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  @IsOptional()
  @IsBoolean()
  acceptManualReview?: boolean;

  @IsOptional()
  @IsString()
  deliveryAddressId?: string;
}
