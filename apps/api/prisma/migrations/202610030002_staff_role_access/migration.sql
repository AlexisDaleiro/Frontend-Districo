CREATE TABLE "StaffRoleAccess" (
    "role" "Role" NOT NULL,
    "feature" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRoleAccess_pkey" PRIMARY KEY ("role","feature"),
    CONSTRAINT "StaffRoleAccess_edit_requires_view" CHECK (NOT "canEdit" OR "canView")
);
