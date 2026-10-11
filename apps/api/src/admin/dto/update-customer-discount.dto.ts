import { CustomerDiscountMode } from '@prisma/client';
import { IsEnum, IsNumber, Max, Min } from 'class-validator';

export class UpdateCustomerDiscountDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercentage!: number;

  @IsEnum(CustomerDiscountMode)
  discountMode!: CustomerDiscountMode;
}
