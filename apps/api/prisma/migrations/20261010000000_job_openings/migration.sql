CREATE TABLE "JobOpening" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "published" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT[] NOT NULL,
    "benefits" TEXT[] NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "JobOpening_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobOpening_active_deletedAt_published_idx" ON "JobOpening"("active", "deletedAt", "published");
