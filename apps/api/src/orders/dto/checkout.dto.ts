import { IsBoolean, IsOptional } from 'class-validator';

export class CheckoutDto {
  @IsOptional()
  @IsBoolean()
  acceptManualReview?: boolean;
}
