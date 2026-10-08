-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL,
    "mfa" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthEmailToken" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthEmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthRefreshToken" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "familyExpiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "claims" JSONB,

    CONSTRAINT "AuthRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthRevokedFamily" (
    "id" TEXT NOT NULL,

    CONSTRAINT "AuthRevokedFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthTotp" (
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL,
    "pendingSecret" TEXT,
    "lastUsedStep" INTEGER,

    CONSTRAINT "AuthTotp_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AuthRecoveryCode" (
    "userId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "AuthRecoveryCode_pkey" PRIMARY KEY ("userId","hash")
);

-- CreateTable
CREATE TABLE "AuthMfaFailure" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthMfaFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthEmailToken_userId_purpose_idx" ON "AuthEmailToken"("userId", "purpose");

-- CreateIndex
CREATE INDEX "AuthEmailToken_expiresAt_idx" ON "AuthEmailToken"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthRefreshToken_userId_idx" ON "AuthRefreshToken"("userId");

-- CreateIndex
CREATE INDEX "AuthRefreshToken_familyId_idx" ON "AuthRefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "AuthMfaFailure_userId_at_idx" ON "AuthMfaFailure"("userId", "at");

-- Auth is a private backend store: public sign-in requires lookups before a user is known.
-- These policies restrict DB roles; per-user product authorization remains the API responsibility.
GRANT USAGE ON SCHEMA public TO dayjoin_app;
REVOKE ALL ON TABLE "User" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "User" TO dayjoin_app;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_backend ON "User" TO dayjoin_app, dayjoin_migrator USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE "AuthSession" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AuthSession" TO dayjoin_app;
ALTER TABLE "AuthSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthSession" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_backend ON "AuthSession" TO dayjoin_app, dayjoin_migrator USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE "AuthEmailToken" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AuthEmailToken" TO dayjoin_app;
ALTER TABLE "AuthEmailToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthEmailToken" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_backend ON "AuthEmailToken" TO dayjoin_app, dayjoin_migrator USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE "AuthRefreshToken" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AuthRefreshToken" TO dayjoin_app;
ALTER TABLE "AuthRefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthRefreshToken" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_backend ON "AuthRefreshToken" TO dayjoin_app, dayjoin_migrator USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE "AuthRevokedFamily" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AuthRevokedFamily" TO dayjoin_app;
ALTER TABLE "AuthRevokedFamily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthRevokedFamily" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_backend ON "AuthRevokedFamily" TO dayjoin_app, dayjoin_migrator USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE "AuthTotp" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AuthTotp" TO dayjoin_app;
ALTER TABLE "AuthTotp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthTotp" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_backend ON "AuthTotp" TO dayjoin_app, dayjoin_migrator USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE "AuthRecoveryCode" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AuthRecoveryCode" TO dayjoin_app;
ALTER TABLE "AuthRecoveryCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthRecoveryCode" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_backend ON "AuthRecoveryCode" TO dayjoin_app, dayjoin_migrator USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE "AuthMfaFailure" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AuthMfaFailure" TO dayjoin_app;
ALTER TABLE "AuthMfaFailure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthMfaFailure" FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_backend ON "AuthMfaFailure" TO dayjoin_app, dayjoin_migrator USING (true) WITH CHECK (true);
