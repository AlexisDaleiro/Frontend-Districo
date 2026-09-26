"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.targetMatches = targetMatches;
exports.promotionApplies = promotionApplies;
exports.calculatePromotionDiscounts = calculatePromotionDiscounts;
const client_1 = require("@prisma/client");
function targetMatches(line, targetType, targetId) {
    if (!targetId)
        return true;
    if (targetType === client_1.PromotionTargetType.PRODUCT)
        return line.productId === targetId;
    if (targetType === client_1.PromotionTargetType.PRODUCT_VARIANT)
        return line.variantId === targetId;
    if (targetType === client_1.PromotionTargetType.BRAND)
        return line.brandId === targetId;
    if (targetType === client_1.PromotionTargetType.LABORATORY)
        return line.laboratoryId === targetId;
    if (targetType === client_1.PromotionTargetType.CATEGORY)
        return line.categoryIds.includes(targetId);
    return false;
}
function promotionApplies(lines, promotion) {
    return promotion.conditions.every((condition) => {
        const matchingLines = lines.filter((line) => targetMatches(line, condition.targetType, condition.targetId));
        const quantity = matchingLines.reduce((sum, line) => sum + line.quantity, 0);
        const amount = matchingLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
        if (condition.metric === client_1.PromotionMetric.MIN_AMOUNT) {
            return amount >= Number(condition.minAmount ?? 0);
        }
        return quantity >= Number(condition.minQuantity ?? 0);
    });
}
function calculatePromotionDiscounts(lines, promotions) {
    const discounts = [];
    const orderedPromotions = promotions
        .filter((promotion) => promotionApplies(lines, promotion))
        .sort((a, b) => b.priority - a.priority);
    for (const promotion of orderedPromotions) {
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
            const line = lines[lineIndex];
            const rewardDiscounts = promotion.rewards
                .filter((reward) => targetMatches(line, reward.targetType, reward.targetId))
                .map((reward) => {
                const gross = line.unitPrice * line.quantity;
                if (reward.rewardType === client_1.PromotionRewardType.PERCENTAGE)
                    return gross * (Number(reward.percentage ?? 0) / 100);
                if (reward.rewardType === client_1.PromotionRewardType.FIXED_AMOUNT)
                    return Math.min(gross, Number(reward.amount ?? 0));
                if (reward.rewardType === client_1.PromotionRewardType.PROMOTIONAL_PRICE) {
                    const promotionalTotal = Number(reward.amount ?? line.unitPrice) * line.quantity;
                    return Math.max(0, gross - promotionalTotal);
                }
                return 0;
            });
            const amount = Math.max(0, ...rewardDiscounts);
            if (!amount)
                continue;
            if (!promotion.combinable) {
                const existingIndex = discounts.findIndex((discount) => discount.lineIndex === lineIndex);
                if (existingIndex >= 0) {
                    if (amount > discounts[existingIndex].amount) {
                        discounts[existingIndex] = { lineIndex, promotionId: promotion.id, promotionName: promotion.name, amount };
                    }
                    continue;
                }
            }
            discounts.push({ lineIndex, promotionId: promotion.id, promotionName: promotion.name, amount });
        }
    }
    return discounts;
}
//# sourceMappingURL=promotion-rules.js.map