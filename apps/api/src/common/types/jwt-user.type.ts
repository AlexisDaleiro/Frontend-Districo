import { Permission, Role } from '@prisma/client';

export interface JwtUser {
  sub: string;
  email: string;
  role: Role;
  customRoleId?: string | null;
  permissions: Permission[];
  customerAccountId?: string | null;
}
