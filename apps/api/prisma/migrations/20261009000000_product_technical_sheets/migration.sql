ALTER TABLE "Product"
  ADD COLUMN "technicalSheet" JSONB,
  ADD COLUMN "technicalSheetRevision" INTEGER NOT NULL DEFAULT 0;
