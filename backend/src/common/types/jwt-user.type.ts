import { Permission, Role } from '@prisma/client';

export interface JwtUser {
  sub: string;
  email: string;
  role: Role;
  permissions: Permission[];
  customerAccountId?: string | null;
}
