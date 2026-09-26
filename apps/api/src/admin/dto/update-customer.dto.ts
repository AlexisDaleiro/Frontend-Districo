import { AccountStatus, CreditStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional()
  @IsEnum(AccountStatus)
  accountStatus?: AccountStatus;

  @IsOptional()
  @IsBoolean()
  medicationPermission?: boolean;

  @IsOptional()
  @IsEnum(CreditStatus)
  creditStatus?: CreditStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsString()
  internalCreditNote?: string;
}
