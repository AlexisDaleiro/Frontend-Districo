CREATE TYPE "JobApplicationStatus" AS ENUM ('NEW', 'IN_REVIEW', 'INTERVIEW', 'HIRED', 'REJECTED');
CREATE TABLE "JobApplication" (
  "id" TEXT NOT NULL PRIMARY KEY, "jobId" TEXT NOT NULL, "submissionId" TEXT NOT NULL,
  "name" TEXT NOT NULL, "email" TEXT NOT NULL, "phone" TEXT NOT NULL, "message" TEXT,
  "status" "JobApplicationStatus" NOT NULL DEFAULT 'NEW', "cvPath" TEXT NOT NULL,
  "cvFilename" TEXT NOT NULL, "cvSize" INTEGER NOT NULL, "consentAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobOpening"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "JobApplication_submissionId_key" ON "JobApplication"("submissionId");
CREATE UNIQUE INDEX "JobApplication_jobId_email_key" ON "JobApplication"("jobId", "email");
CREATE INDEX "JobApplication_jobId_status_createdAt_idx" ON "JobApplication"("jobId", "status", "createdAt");
ALTER TABLE "JobApplication" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "JobApplication" FROM anon, authenticated;
