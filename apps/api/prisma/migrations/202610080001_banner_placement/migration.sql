ALTER TABLE "StoreBanner" ADD COLUMN "placement" TEXT NOT NULL DEFAULT 'ECOMMERCE';
ALTER TABLE "StoreBanner" ADD CONSTRAINT "StoreBanner_placement_check" CHECK ("placement" IN ('ECOMMERCE', 'INSTITUTIONAL'));
CREATE INDEX "StoreBanner_placement_active_position_idx" ON "StoreBanner"("placement", "active", "position");
