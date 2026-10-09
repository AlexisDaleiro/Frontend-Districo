import type { Rule } from './types';

export const ruleStatusOptions = [['ACTIVE', 'Vigentes'], ['SCHEDULED', 'Programadas'], ['EXPIRED', 'Vencidas'], ['INACTIVE', 'Desactivadas']] as const;

export function ruleStatus(rule: Pick<Rule, 'active' | 'startsAt' | 'endsAt'>, now = Date.now()) {
  if (rule.endsAt && new Date(rule.endsAt).getTime() < now) return 'EXPIRED';
  if (rule.active === false) return 'INACTIVE';
  if (rule.startsAt && new Date(rule.startsAt).getTime() > now) return 'SCHEDULED';
  return 'ACTIVE';
}

export function rulePage<T extends Rule>(rules: T[], params: URLSearchParams, now = Date.now()) {
  const search = (params.get('search') ?? '').trim().toLocaleLowerCase('es');
  const status = params.get('status');
  const page = Math.max(1, Number(params.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.get('limit')) || 20));
  const items = rules.filter((rule) => (!search || rule.name.toLocaleLowerCase('es').includes(search)) && (!status || ruleStatus(rule, now) === status))
    .sort((a, b) => Number(b.active !== false) - Number(a.active !== false) || (b.priority ?? 0) - (a.priority ?? 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return { items: items.slice((page - 1) * limit, page * limit), meta: { total: items.length, page, limit } };
}
