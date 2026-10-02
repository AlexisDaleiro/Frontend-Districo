import { IsBoolean } from 'class-validator';

export class UpdateStaffActiveDto {
  @IsBoolean()
  active: boolean;
}
