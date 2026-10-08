import { Prisma } from '@prisma/client';
import { StaffListQueryDto } from './dto/admin-list-query.dto';

export function pendingInvitation(now: Date): Prisma.StaffInvitationWhereInput {
  return { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } };
}
export function staffListWhere(query: StaffListQueryDto, now: Date): Prisma.UserWhereInput {
  const status: Prisma.UserWhereInput = query.status === 'ACTIVE' ? { active: true }
    : query.status === 'INACTIVE' ? { active: false, emailVerified: true }
    : query.status === 'PENDING' ? { active: false, emailVerified: false, staffInvitations: { some: pendingInvitation(now) } }
    : query.status === 'UNVERIFIED' ? { active: false, emailVerified: false, staffInvitations: { none: pendingInvitation(now) } } : {};
  return { customerAccountId: null, role: query.role, customRoleId: query.customRoleId,
    ...(query.search?.trim() ? { OR: [{ email: { contains: query.search.trim(), mode: 'insensitive' } }, { customRole: { name: { contains: query.search.trim(), mode: 'insensitive' } } }] } : {}), ...status };
}
