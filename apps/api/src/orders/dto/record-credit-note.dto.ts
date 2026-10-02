import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class RecordCreditNoteDto {
  @Matches(/^\d{1,10}(?:\.\d{1,2})?$/)
  amount: string;

  @IsUUID()
  requestId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  noteNumber?: string;
}
