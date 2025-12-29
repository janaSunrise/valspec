import { Elysia, t } from "elysia";

import prisma from "@valspec/db";

import { MAX_DOTENV_IMPORT_SIZE } from "../constants";
import { createAuditLog } from "../lib/audit";
import { decryptSecret, encryptSecret } from "../lib/crypto";
import { formatDotenv, parseDotenv, validateSecrets } from "../lib/dotenv";
import { buildInheritanceChain, resolveSecrets } from "../lib/inheritance";
import { getEnvironment, getSecret } from "../lib/ownership";
import { sessionAuth } from "../plugins/session-auth";
import { createSecretSchema, updateSecretSchema } from "../schemas/secret";

export const secretRoutes = new Elysia({ prefix: "/projects/:projectId/environments/:envId/secrets" })
  .use(sessionAuth)

  .get(
    "/",
    async ({ session, params, status }) => {
      const env = await getEnvironment(params.projectId, params.envId, session.user.id);
      if (!env) throw status(404, { code: "NOT_FOUND", message: "Environment not found" });

      const environments = await prisma.environment.findMany({
        where: { projectId: params.projectId },
        select: { id: true, name: true, inheritsFromId: true },
      });

      const chain = buildInheritanceChain(params.envId, environments);
      const secrets = await prisma.secret.findMany({
        where: { environmentId: { in: chain } },
        select: {
          id: true,
          key: true,
          encryptedValue: true,
          iv: true,
          authTag: true,
          version: true,
          environmentId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return resolveSecrets(params.envId, environments, secrets).map((s) => ({
        id: s.id,
        key: s.key,
        version: s.version,
        environmentId: s.environmentId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        inherited: s.inherited,
        sourceEnvironmentId: s.sourceEnvironmentId,
        sourceEnvironmentName: s.sourceEnvironmentName,
      }));
    },
    { params: t.Object({ projectId: t.String(), envId: t.String() }) },
  )

  .get(
    "/export",
    async ({ session, params, status }) => {
      const env = await getEnvironment(params.projectId, params.envId, session.user.id);
      if (!env) throw status(404, { code: "NOT_FOUND", message: "Environment not found" });

      const environments = await prisma.environment.findMany({
        where: { projectId: params.projectId },
        select: { id: true, name: true, inheritsFromId: true },
      });

      const chain = buildInheritanceChain(params.envId, environments);
      const secrets = await prisma.secret.findMany({
        where: { environmentId: { in: chain } },
        select: { id: true, key: true, encryptedValue: true, iv: true, authTag: true, version: true, environmentId: true, createdAt: true, updatedAt: true },
      });

      const resolved = resolveSecrets(params.envId, environments, secrets);
      const decrypted: Record<string, string> = {};
      for (const secret of resolved) {
        decrypted[secret.key] = await decryptSecret({ encryptedValue: secret.encryptedValue, iv: secret.iv, authTag: secret.authTag });
      }

      return { content: formatDotenv(decrypted), count: Object.keys(decrypted).length };
    },
    { params: t.Object({ projectId: t.String(), envId: t.String() }) },
  )

  .get(
    "/:secretId",
    async ({ session, params, status }) => {
      const secret = await getSecret(params.projectId, params.envId, params.secretId, session.user.id);
      if (!secret) throw status(404, { code: "NOT_FOUND", message: "Secret not found" });

      const value = await decryptSecret({ encryptedValue: secret.encryptedValue, iv: secret.iv, authTag: secret.authTag });
      return { id: secret.id, key: secret.key, value, version: secret.version, environmentId: secret.environmentId, createdAt: secret.createdAt, updatedAt: secret.updatedAt };
    },
    { params: t.Object({ projectId: t.String(), envId: t.String(), secretId: t.String() }) },
  )

  .post(
    "/",
    async ({ session, params, body, status }) => {
      const env = await getEnvironment(params.projectId, params.envId, session.user.id);
      if (!env) throw status(404, { code: "NOT_FOUND", message: "Environment not found" });

      const validation = createSecretSchema.safeParse(body);
      if (!validation.success) {
        throw status(400, { code: "BAD_REQUEST", message: validation.error.issues[0]?.message ?? "Invalid input" });
      }

      const { key, value } = validation.data;

      const existing = await prisma.secret.findFirst({ where: { environmentId: params.envId, key } });
      if (existing) throw status(409, { code: "CONFLICT", message: "Secret with this key already exists" });

      const encrypted = await encryptSecret(value);
      const secret = await prisma.$transaction(async (tx) => {
        const s = await tx.secret.create({
          data: { key, encryptedValue: encrypted.encryptedValue, iv: encrypted.iv, authTag: encrypted.authTag, version: 1, environmentId: params.envId },
        });
        await tx.secretVersion.create({
          data: { secretId: s.id, version: 1, encryptedValue: encrypted.encryptedValue, iv: encrypted.iv, authTag: encrypted.authTag, changeType: "CREATED", changeSource: "WEB" },
        });
        return s;
      });

      await createAuditLog({
        action: "SECRET_CREATED",
        projectId: params.projectId,
        environmentId: params.envId,
        secretId: secret.id,
        actorType: "USER",
        actorUserId: session.user.id,
        metadata: { key: secret.key },
      });

      return { id: secret.id, key: secret.key, version: secret.version, environmentId: secret.environmentId, createdAt: secret.createdAt, updatedAt: secret.updatedAt };
    },
    { params: t.Object({ projectId: t.String(), envId: t.String() }), body: t.Object({ key: t.String(), value: t.String() }) },
  )

  .post(
    "/import",
    async ({ session, params, body, status }) => {
      const env = await getEnvironment(params.projectId, params.envId, session.user.id);
      if (!env) throw status(404, { code: "NOT_FOUND", message: "Environment not found" });

      if (body.content.length > MAX_DOTENV_IMPORT_SIZE) {
        throw status(400, { code: "BAD_REQUEST", message: "Content too large" });
      }

      const parsed = parseDotenv(body.content);
      const { valid, errors } = validateSecrets(parsed);

      if (Object.keys(valid).length === 0) {
        throw status(400, { code: "BAD_REQUEST", message: errors.length > 0 ? errors.join("; ") : "No valid secrets found" });
      }

      const created: string[] = [];
      const updated: string[] = [];
      const skipped: string[] = [];

      for (const [key, value] of Object.entries(valid)) {
        const existing = await prisma.secret.findFirst({ where: { environmentId: params.envId, key } });

        if (existing) {
          if (!body.overwrite) {
            skipped.push(key);
            continue;
          }

          const encrypted = await encryptSecret(value);
          const newVersion = existing.version + 1;

          await prisma.$transaction(async (tx) => {
            await tx.secret.update({
              where: { id: existing.id },
              data: { encryptedValue: encrypted.encryptedValue, iv: encrypted.iv, authTag: encrypted.authTag, version: newVersion },
            });
            await tx.secretVersion.create({
              data: { secretId: existing.id, version: newVersion, encryptedValue: encrypted.encryptedValue, iv: encrypted.iv, authTag: encrypted.authTag, changeType: "UPDATED", changeSource: "IMPORT" },
            });
          });

          await createAuditLog({
            action: "SECRET_UPDATED",
            projectId: params.projectId,
            environmentId: params.envId,
            secretId: existing.id,
            actorType: "USER",
            actorUserId: session.user.id,
            metadata: { key, version: newVersion, source: "import" },
          });
          updated.push(key);
        } else {
          const encrypted = await encryptSecret(value);
          const secret = await prisma.$transaction(async (tx) => {
            const s = await tx.secret.create({
              data: { key, encryptedValue: encrypted.encryptedValue, iv: encrypted.iv, authTag: encrypted.authTag, version: 1, environmentId: params.envId },
            });
            await tx.secretVersion.create({
              data: { secretId: s.id, version: 1, encryptedValue: encrypted.encryptedValue, iv: encrypted.iv, authTag: encrypted.authTag, changeType: "CREATED", changeSource: "IMPORT" },
            });
            return s;
          });

          await createAuditLog({
            action: "SECRET_CREATED",
            projectId: params.projectId,
            environmentId: params.envId,
            secretId: secret.id,
            actorType: "USER",
            actorUserId: session.user.id,
            metadata: { key, source: "import" },
          });
          created.push(key);
        }
      }

      return { created, updated, skipped, errors };
    },
    { params: t.Object({ projectId: t.String(), envId: t.String() }), body: t.Object({ content: t.String(), overwrite: t.Optional(t.Boolean()) }) },
  )

  .patch(
    "/:secretId",
    async ({ session, params, body, status }) => {
      const secret = await getSecret(params.projectId, params.envId, params.secretId, session.user.id);
      if (!secret) throw status(404, { code: "NOT_FOUND", message: "Secret not found" });

      const validation = updateSecretSchema.safeParse(body);
      if (!validation.success) {
        throw status(400, { code: "BAD_REQUEST", message: validation.error.issues[0]?.message ?? "Invalid input" });
      }

      const encrypted = await encryptSecret(validation.data.value);
      const newVersion = secret.version + 1;

      const updated = await prisma.$transaction(async (tx) => {
        const s = await tx.secret.update({
          where: { id: params.secretId },
          data: { encryptedValue: encrypted.encryptedValue, iv: encrypted.iv, authTag: encrypted.authTag, version: newVersion },
        });
        await tx.secretVersion.create({
          data: { secretId: params.secretId, version: newVersion, encryptedValue: encrypted.encryptedValue, iv: encrypted.iv, authTag: encrypted.authTag, changeType: "UPDATED", changeSource: "WEB" },
        });
        return s;
      });

      await createAuditLog({
        action: "SECRET_UPDATED",
        projectId: params.projectId,
        environmentId: params.envId,
        secretId: updated.id,
        actorType: "USER",
        actorUserId: session.user.id,
        metadata: { key: updated.key, version: updated.version },
      });

      return { id: updated.id, key: updated.key, version: updated.version, environmentId: updated.environmentId, createdAt: updated.createdAt, updatedAt: updated.updatedAt };
    },
    { params: t.Object({ projectId: t.String(), envId: t.String(), secretId: t.String() }), body: t.Object({ value: t.String() }) },
  )

  .delete(
    "/:secretId",
    async ({ session, params, status }) => {
      const secret = await getSecret(params.projectId, params.envId, params.secretId, session.user.id);
      if (!secret) throw status(404, { code: "NOT_FOUND", message: "Secret not found" });

      await prisma.$transaction(async (tx) => {
        await tx.secretVersion.create({
          data: { secretId: params.secretId, version: secret.version + 1, encryptedValue: secret.encryptedValue, iv: secret.iv, authTag: secret.authTag, changeType: "DELETED", changeSource: "WEB" },
        });
        await tx.secret.delete({ where: { id: params.secretId } });
      });

      await createAuditLog({
        action: "SECRET_DELETED",
        projectId: params.projectId,
        environmentId: params.envId,
        secretId: params.secretId,
        actorType: "USER",
        actorUserId: session.user.id,
        metadata: { key: secret.key },
      });

      return { success: true };
    },
    { params: t.Object({ projectId: t.String(), envId: t.String(), secretId: t.String() }) },
  );
