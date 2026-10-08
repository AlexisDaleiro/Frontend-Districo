ALTER TABLE "RecommendationRule"
  ADD COLUMN "triggerIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "targetType" "RecommendationTriggerType" NOT NULL DEFAULT 'PRODUCT',
  ADD COLUMN "targetIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "RecommendationRule" SET "triggerIds" = ARRAY["triggerId"];
UPDATE "RecommendationRule" AS rule
SET "targetIds" = ARRAY(
  SELECT item."productId" FROM "RecommendationRuleProduct" AS item
  WHERE item."ruleId" = rule."id" GROUP BY item."productId"
  ORDER BY MIN(item."position"), item."productId"
);
