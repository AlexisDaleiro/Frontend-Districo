import { BadRequestException } from '@nestjs/common';
import { RecommendationTriggerType } from '@prisma/client';
import { CreateRecommendationRuleDto } from './dto/create-recommendation-rule.dto';

export function recommendationScope(dto: CreateRecommendationRuleDto) {
  if (dto.name.trim().length < 2) throw new BadRequestException('El nombre debe tener al menos dos caracteres.');
  const triggerIds = dto.triggerIds ?? (dto.triggerId ? [dto.triggerId] : []);
  const targetType = dto.targetType ?? RecommendationTriggerType.PRODUCT;
  const targetIds = dto.targetIds ?? [...new Set((dto.products ?? []).map((item) => item.productId))];
  for (const ids of [triggerIds, targetIds]) {
    if (!Array.isArray(ids) || !ids.length || ids.length > 100 || new Set(ids).size !== ids.length || ids.some((id) => typeof id !== 'string' || !id.trim() || id.length > 100))
      throw new BadRequestException('Elegí entre uno y cien elementos distintos en cada selección.');
  }
  if (!Object.values(RecommendationTriggerType).includes(dto.triggerType) || !Object.values(RecommendationTriggerType).includes(targetType)) throw new BadRequestException('Tipo de selección inválido.');
  if (dto.startsAt && dto.endsAt && new Date(dto.endsAt) < new Date(dto.startsAt)) throw new BadRequestException('La fecha final debe ser posterior al inicio.');
  if (targetType !== RecommendationTriggerType.PRODUCT && dto.products?.length) throw new BadRequestException('Las marcas y categorías no aceptan productos elegidos a mano en la misma selección.');
  if (dto.products?.some((item) => !targetIds.includes(item.productId))) throw new BadRequestException('Los productos recomendados no coinciden con la selección.');
  const products = targetType === RecommendationTriggerType.PRODUCT ? targetIds.flatMap((productId, position) => {
    const saved = dto.products?.filter((item) => item.productId === productId);
    return saved?.length ? saved.map((item) => ({ productId, variantId: item.variantId, position: item.position ?? position })) : [{ productId, variantId: undefined, position }];
  }) : [];
  if (new Set(products.map((item) => `${item.productId}:${item.variantId ?? ''}`)).size !== products.length) throw new BadRequestException('Hay productos o presentaciones repetidos.');
  return { triggerType: dto.triggerType, triggerId: triggerIds[0], triggerIds, targetType, targetIds, products };
}
