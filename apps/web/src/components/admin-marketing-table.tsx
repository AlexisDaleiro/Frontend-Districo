"use client";

import { Pencil, Play, Pause, Trash2 } from 'lucide-react';
import { money } from '@/lib/commerce';
import { ruleStatus } from '@/lib/marketing-list';
import type { Rule } from '@/lib/types';

const statusLabels = { ACTIVE: 'Vigente', SCHEDULED: 'Programada', EXPIRED: 'Vencida', INACTIVE: 'Desactivada' };
const date = (value?: string) => value ? new Date(value).toLocaleDateString('es-UY') : '';

function selections(items: { id: string; name: string }[] | undefined, fallback: string) {
  if (!items?.length) return <span>{fallback}</span>;
  return <span title={items.map((item) => item.name).join(', ')}>{items.slice(0, 2).map((item) => item.name).join(', ')}{items.length > 2 ? ` +${items.length - 2}` : ''}</span>;
}

function reward(rule: Rule) {
  const values = [...new Set(rule.rewards?.map((item) => item.rewardType === 'PERCENTAGE' ? `${Number(item.percentage)}%`
    : item.rewardType === 'PROMOTIONAL_PRICE' ? `Precio ${money(Number(item.amount))}` : `${money(Number(item.amount))} por unidad`) ?? [])];
  return values.join(' · ') || 'Regla cruzada';
}

export function AdminMarketingTable({ items, recommendations, canEdit, busy, onEdit, onActive, onDelete }: {
  items: Rule[]; recommendations: boolean; canEdit: boolean; busy: boolean;
  onEdit: (rule: Rule) => void; onActive: (rule: Rule) => void; onDelete: (rule: Rule) => void;
}) {
  return <div className="table-wrap"><table className="admin-marketing-table">
    <thead><tr><th>Regla</th><th>Se activa al comprar</th><th>{recommendations ? 'Recomendar' : 'Beneficio'}</th><th>Vigencia</th><th>Estado</th>{canEdit && <th>Acciones</th>}</tr></thead>
    <tbody>{items.map((rule) => <tr key={rule.id}>
      <td><strong>{rule.name}</strong>{rule.description && <p className="muted small-copy admin-rule-description" title={rule.description}>{rule.description}</p>}</td>
      <td>{selections(rule.triggerTargets, recommendations ? rule.triggerIds?.join(', ') || rule.triggerId || 'Sin condición' : rule.conditions?.length ? 'Regla cruzada' : 'Sin condición')}
        {rule.conditions?.[0] && <p className="small-copy muted">{rule.conditions[0].metric === 'MIN_AMOUNT' ? `Mínimo ${money(Number(rule.conditions[0].minAmount ?? 0))}` : `Mínimo ${rule.conditions[0].minQuantity ?? 1} u.`}</p>}
        {recommendations && !!rule.minimumQuantity && <p className="small-copy muted">Mínimo {rule.minimumQuantity} u.</p>}
      </td>
      <td>{!recommendations && <strong>{reward(rule)}<br /></strong>}{selections(rule.targetTargets, recommendations ? rule.targetIds?.join(', ') || rule.products?.map((item) => item.productId).join(', ') || 'Sin selección' : 'Ver regla')}
        {!recommendations && !!rule.rewards?.length && <p className="small-copy muted">{rule.rewards.length} {rule.rewards[0].targetType === 'PRODUCT' ? rule.rewards.length === 1 ? 'producto' : 'productos' : rule.rewards[0].targetType === 'BRAND' ? rule.rewards.length === 1 ? 'marca' : 'marcas' : rule.rewards[0].targetType === 'CATEGORY' ? rule.rewards.length === 1 ? 'categoría' : 'categorías' : 'destinos'}</p>}
      </td>
      <td><span>{date(rule.startsAt) || 'Sin inicio'}</span><br /><span className="muted small-copy">{rule.endsAt ? `Hasta ${date(rule.endsAt)}` : 'Sin vencimiento'}</span></td>
      <td><span className={`status-pill rule-status-${ruleStatus(rule).toLowerCase()}`}>{statusLabels[ruleStatus(rule)]}</span></td>
      {canEdit && <td><div className="actions admin-rule-actions">
        <button className="icon-button" title={`Editar ${rule.name}`} aria-label={`Editar ${rule.name}`} disabled={busy} onClick={() => onEdit(rule)}><Pencil size={16} /></button>
        <button className="icon-button" title={rule.active === false ? 'Activar' : 'Desactivar'} aria-label={`${rule.active === false ? 'Activar' : 'Desactivar'} ${rule.name}`} disabled={busy} onClick={() => onActive(rule)}>{rule.active === false ? <Play size={16} /> : <Pause size={16} />}</button>
        <button className="icon-button" title={`Eliminar ${rule.name}`} aria-label={`Eliminar ${rule.name}`} disabled={busy} onClick={() => onDelete(rule)}><Trash2 size={16} /></button>
      </div></td>}
    </tr>)}</tbody>
  </table></div>;
}
