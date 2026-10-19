CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "revokedAt" TIMESTAMPTZ(3),
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE TABLE "AuthRefreshToken" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  CONSTRAINT "AuthRefreshToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthRefreshToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuthSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AuthRefreshToken_sessionId_hash_key" ON "AuthRefreshToken"("sessionId", "hash");
