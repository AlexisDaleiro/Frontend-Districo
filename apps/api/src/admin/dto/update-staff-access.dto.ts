import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { staffFeatures } from '../../common/staff-role-access';

export class StaffAccessEntryDto {
  @IsIn(staffFeatures)
  feature: typeof staffFeatures[number];

  @IsBoolean()
  canView: boolean;

  @IsBoolean()
  canEdit: boolean;
}

export class UpdateStaffAccessDto {
  @IsArray()
  @ArrayMinSize(staffFeatures.length)
  @ArrayMaxSize(staffFeatures.length)
  @ValidateNested({ each: true })
  @Type(() => StaffAccessEntryDto)
  entries: StaffAccessEntryDto[];
}
