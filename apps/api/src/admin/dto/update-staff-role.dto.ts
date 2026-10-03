import { Role } from '@prisma/client';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateStaffRoleDto {
  @IsIn([Role.ADMIN, Role.SALES, Role.CATALOG, Role.FINANCE, Role.CUSTOM])
  role: Role;

  @IsOptional()
  @IsString()
  customRoleId?: string;
}
