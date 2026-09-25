import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReviewApplicationDto {
  @IsOptional()
  @IsBoolean()
  medicationPermission?: boolean;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
