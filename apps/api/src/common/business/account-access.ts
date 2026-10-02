import { AccountStatus, Permission, Role } from '@prisma/client';

export function effectivePermissions(
  role: Role,
  accountStatus: AccountStatus | null | undefined,
  permissions: Permission[],
) {
  if (role !== Role.CLIENT) return [];
  if (accountStatus === AccountStatus.APPROVED) return permissions;
  return permissions.filter((permission) => permission !== Permission.CAN_PLACE_ORDERS);
}
