import { IsUUID, Matches } from 'class-validator';

export class RecordOrderPaymentDto {
  @Matches(/^\d{1,10}(?:\.\d{1,2})?$/)
  amount: string;

  @IsUUID()
  requestId: string;
}
