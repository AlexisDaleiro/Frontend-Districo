import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AttachOrderInvoiceDto {
  @IsUUID()
  requestId: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  replacesInvoiceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  replacementReason?: string;
}
