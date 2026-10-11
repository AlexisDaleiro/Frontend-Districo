ALTER TABLE "User" ADD COLUMN "mfaSecretEncrypted" TEXT, ADD COLUMN "mfaEnabledAt" TIMESTAMP(3), ADD COLUMN "mfaLastStep" INTEGER;
CREATE TABLE "AuthSession" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3),
  "userAgent" TEXT, "mfaVerifiedAt" TIMESTAMP(3), "pendingMfaSecret" TEXT, "pendingMfaExpiresAt" TIMESTAMP(3),
  CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AuthSession_userId_revokedAt_expiresAt_idx" ON "AuthSession"("userId", "revokedAt", "expiresAt");
ALTER TABLE "RefreshToken" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuthSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "RefreshToken_sessionId_revokedAt_idx" ON "RefreshToken"("sessionId", "revokedAt");
CREATE TABLE "MfaChallenge" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3), "attempts" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "MfaChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "MfaChallenge_userId_expiresAt_idx" ON "MfaChallenge"("userId", "expiresAt");
CREATE TABLE "MfaRecoveryCode" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "codeHash" TEXT NOT NULL, "usedAt" TIMESTAMP(3),
  CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MfaRecoveryCode_codeHash_key" ON "MfaRecoveryCode"("codeHash");
CREATE INDEX "MfaRecoveryCode_userId_usedAt_idx" ON "MfaRecoveryCode"("userId", "usedAt");
ALTER TABLE "AuthSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MfaChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MfaRecoveryCode" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AuthSession", "MfaChallenge", "MfaRecoveryCode" FROM anon, authenticated;
-- Old tokens have no session identifier and cannot authenticate after deployment.
UPDATE "RefreshToken" SET "revokedAt" = CURRENT_TIMESTAMP WHERE "revokedAt" IS NULL;
