import { IsUUID } from 'class-validator';

export class AttachOrderInvoiceDto {
  @IsUUID()
  requestId: string;
}
