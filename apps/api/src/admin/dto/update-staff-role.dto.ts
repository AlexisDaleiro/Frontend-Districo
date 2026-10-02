import { Role } from '@prisma/client';
import { IsIn } from 'class-validator';

export class UpdateStaffRoleDto {
  @IsIn([Role.ADMIN, Role.SALES, Role.CATALOG, Role.FINANCE])
  role: Role;
}
