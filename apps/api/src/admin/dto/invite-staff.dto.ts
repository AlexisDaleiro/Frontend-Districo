import { Role } from '@prisma/client';
import { IsEmail, IsIn, MaxLength } from 'class-validator';

export class InviteStaffDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsIn([Role.ADMIN, Role.SALES, Role.CATALOG, Role.FINANCE])
  role: Role;
}
