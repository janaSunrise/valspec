-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED', 'ENVIRONMENT_CREATED', 'ENVIRONMENT_UPDATED', 'ENVIRONMENT_DELETED', 'SECRET_CREATED', 'SECRET_UPDATED', 'SECRET_DELETED', 'SECRET_VIEWED', 'API_KEY_CREATED', 'API_KEY_REVOKED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'API_KEY');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('CREATED', 'UPDATED', 'DELETED');

-- CreateEnum
CREATE TYPE "ChangeSource" AS ENUM ('WEB', 'API', 'CLI', 'IMPORT');

-- CreateTable
CREATE TABLE "project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "inheritsFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secret" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secret_version" (
    "id" TEXT NOT NULL,
    "secretId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "changeSource" "ChangeSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secret_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "environmentId" TEXT,
    "secretId" TEXT,
    "action" "AuditAction" NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "actorUserId" TEXT,
    "actorIp" TEXT,
    "actorUserAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_userId_idx" ON "project"("userId");

-- CreateIndex
CREATE INDEX "project_slug_idx" ON "project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "project_userId_slug_key" ON "project"("userId", "slug");

-- CreateIndex
CREATE INDEX "environment_projectId_idx" ON "environment"("projectId");

-- CreateIndex
CREATE INDEX "environment_inheritsFromId_idx" ON "environment"("inheritsFromId");

-- CreateIndex
CREATE UNIQUE INDEX "environment_projectId_slug_key" ON "environment"("projectId", "slug");

-- CreateIndex
CREATE INDEX "secret_environmentId_idx" ON "secret"("environmentId");

-- CreateIndex
CREATE UNIQUE INDEX "secret_environmentId_key_key" ON "secret"("environmentId", "key");

-- CreateIndex
CREATE INDEX "secret_version_secretId_idx" ON "secret_version"("secretId");

-- CreateIndex
CREATE INDEX "secret_version_createdAt_idx" ON "secret_version"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "secret_version_secretId_version_key" ON "secret_version"("secretId", "version");

-- CreateIndex
CREATE INDEX "audit_log_projectId_environmentId_idx" ON "audit_log"("projectId", "environmentId");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_actorType_actorId_idx" ON "audit_log"("actorType", "actorId");

-- CreateIndex
CREATE INDEX "audit_log_actorUserId_idx" ON "audit_log"("actorUserId");

-- AddForeignKey
ALTER TABLE "environment" ADD CONSTRAINT "environment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment" ADD CONSTRAINT "environment_inheritsFromId_fkey" FOREIGN KEY ("inheritsFromId") REFERENCES "environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret" ADD CONSTRAINT "secret_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_version" ADD CONSTRAINT "secret_version_secretId_fkey" FOREIGN KEY ("secretId") REFERENCES "secret"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
