BEGIN;
CREATE TABLE "PerformanceSample" (
 "id" VARCHAR(36) PRIMARY KEY, "sequence" INTEGER NOT NULL CHECK ("sequence" BETWEEN 1 AND 10000), "viewId" VARCHAR(36) NOT NULL,
 "name" VARCHAR(20) NOT NULL CHECK ("name" IN ('LCP','INP','CLS','FCP','TTFB','NAVIGATION','DATA_READY','API','IMAGE')),
 "value" DOUBLE PRECISION NOT NULL CHECK ("value" >= 0 AND "value" <= 180000 AND ("name" <> 'CLS' OR "value" <= 10)),
 "page" VARCHAR(20) NOT NULL CHECK ("page" IN ('HOME','CATALOG','PRODUCT','CATEGORY','BRANDS','CART','CHECKOUT','ACCOUNT','ORDERS','LOGIN','REGISTER','ADMIN','INSTITUTIONAL','JOBS','OTHER')),
 "target" VARCHAR(20) NOT NULL CHECK ("target" IN ('PAGE','CATALOG','PRODUCT','TAXONOMY','ACCOUNT','ORDERS','ADMIN','OTHER','LOCAL_IMAGE','EXTERNAL_IMAGE')),
 "phase" VARCHAR(10) NOT NULL CHECK ("phase" IN ('DOCUMENT','SOFT','RESTORE')),
 "cache" VARCHAR(10) NOT NULL CHECK ("cache" IN ('UNKNOWN','NETWORK','CACHE')),
 "outcome" VARCHAR(10) NOT NULL CHECK ("outcome" IN ('OK','ERROR')),
 "device" VARCHAR(10) NOT NULL CHECK ("device" IN ('MOBILE','DESKTOP')),
 "visit" VARCHAR(10) NOT NULL CHECK ("visit" IN ('FIRST','RETURNING','UNKNOWN')),
 "environment" VARCHAR(10) NOT NULL CHECK ("environment" IN ('PRODUCTION','LOCAL')),
 "release" VARCHAR(40) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PerformanceSample_createdAt_environment_device_name_idx" ON "PerformanceSample"("createdAt","environment","device","name");
CREATE INDEX "PerformanceSample_viewId_idx" ON "PerformanceSample"("viewId");
ALTER TABLE "PerformanceSample" ENABLE ROW LEVEL SECURITY;
COMMIT;
