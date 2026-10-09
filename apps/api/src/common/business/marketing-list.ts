import { RuleListQueryDto } from '../../admin/dto/rule-list-query.dto';
import { Prisma } from '@prisma/client';

export function marketingRuleWhere(query: RuleListQueryDto, now: Date, nullableStart?: false): Prisma.PromotionWhereInput;
export function marketingRuleWhere(query: RuleListQueryDto, now: Date, nullableStart: true): Prisma.RecommendationRuleWhereInput;
export function marketingRuleWhere(query: RuleListQueryDto, now: Date, nullableStart = false): Prisma.PromotionWhereInput | Prisma.RecommendationRuleWhereInput {
  const notExpired = { OR: [{ endsAt: null }, { endsAt: { gte: now } }] };
  const status = query.status === 'EXPIRED' ? { endsAt: { lt: now } }
    : query.status === 'INACTIVE' ? { active: false, AND: [notExpired] }
    : query.status === 'SCHEDULED' ? { active: true, startsAt: { gt: now }, AND: [notExpired] }
    : query.status === 'ACTIVE' ? { active: true, AND: [notExpired, nullableStart ? { OR: [{ startsAt: null }, { startsAt: { lte: now } }] } : { startsAt: { lte: now } }] }
    : {};
  return { ...status, ...(query.search?.trim() ? { name: { contains: query.search.trim(), mode: 'insensitive' as const } } : {}) };
}
