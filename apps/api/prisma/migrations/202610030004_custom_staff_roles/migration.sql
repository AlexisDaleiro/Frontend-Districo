ALTER TYPE "Role" ADD VALUE 'CUSTOM';

CREATE TABLE "CustomStaffRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomStaffRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomStaffRole_key_key" ON "CustomStaffRole"("key");

CREATE TABLE "CustomStaffRoleAccess" (
    "roleId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomStaffRoleAccess_pkey" PRIMARY KEY ("roleId","feature"),
    CONSTRAINT "CustomStaffRoleAccess_edit_requires_view" CHECK (NOT "canEdit" OR "canView")
);

ALTER TABLE "User" ADD COLUMN "customRoleId" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomStaffRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomStaffRoleAccess" ADD CONSTRAINT "CustomStaffRoleAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "CustomStaffRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "User_customRoleId_idx" ON "User"("customRoleId");
