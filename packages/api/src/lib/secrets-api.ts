import prisma from "@valspec/db";

import type { ApiKeyData } from "../context";
import { createAuditLog } from "./audit";
import { decryptSecret, encryptSecret } from "./crypto";
import { buildInheritanceChain, resolveSecrets } from "./inheritance";

type ValidationError = { error: string; status: number };

async function validateProjectAndEnvironment(apiKey: ApiKeyData): Promise<ValidationError | null> {
  const { metadata, userId } = apiKey;

  const project = await prisma.project.findFirst({
    where: { id: metadata.projectId, userId },
  });

  if (!project) {
    return { error: "Project not found", status: 404 };
  }

  if (!metadata.environmentId) {
    return { error: "API key must be scoped to an environment", status: 400 };
  }

  const environment = await prisma.environment.findFirst({
    where: { id: metadata.environmentId, projectId: metadata.projectId },
  });

  if (!environment) {
    return { error: "Environment not found", status: 404 };
  }

  return null;
}

export async function getSecrets(
  apiKey: ApiKeyData,
): Promise<{ data: Record<string, string> } | ValidationError> {
  const validationError = await validateProjectAndEnvironment(apiKey);
  if (validationError) return validationError;

  const { metadata } = apiKey;

  const environments = await prisma.environment.findMany({
    where: { projectId: metadata.projectId },
    select: { id: true, name: true, inheritsFromId: true },
  });

  const chain = buildInheritanceChain(metadata.environmentId!, environments);

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

  const resolved = resolveSecrets(metadata.environmentId!, environments, secrets);

  const result: Record<string, string> = {};
  for (const secret of resolved) {
    const decrypted = await decryptSecret({
      encryptedValue: secret.encryptedValue,
      iv: secret.iv,
      authTag: secret.authTag,
    });
    result[secret.key] = decrypted;
  }

  return { data: result };
}

export async function setSecrets(
  apiKey: ApiKeyData,
  secrets: Record<string, string>,
): Promise<{ data: { updated: string[]; created: string[] } } | ValidationError> {
  const { metadata, permissions } = apiKey;

  if (!permissions.includes("write") && !permissions.includes("admin")) {
    return { error: "Insufficient permissions", status: 403 };
  }

  const validationError = await validateProjectAndEnvironment(apiKey);
  if (validationError) return validationError;

  const updated: string[] = [];
  const created: string[] = [];

  for (const [key, value] of Object.entries(secrets)) {
    const encrypted = await encryptSecret(value);

    const existing = await prisma.secret.findFirst({
      where: { environmentId: metadata.environmentId, key },
    });

    if (existing) {
      const newVersion = existing.version + 1;

      await prisma.$transaction(async (tx) => {
        await tx.secret.update({
          where: { id: existing.id },
          data: {
            encryptedValue: encrypted.encryptedValue,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            version: newVersion,
          },
        });

        await tx.secretVersion.create({
          data: {
            secretId: existing.id,
            version: newVersion,
            encryptedValue: encrypted.encryptedValue,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            changeType: "UPDATED",
            changeSource: "API",
          },
        });
      });

      await createAuditLog({
        action: "SECRET_UPDATED",
        projectId: metadata.projectId,
        environmentId: metadata.environmentId,
        secretId: existing.id,
        actorType: "API_KEY",
        actorUserId: apiKey.userId,
        metadata: { key, version: newVersion },
      });

      updated.push(key);
    } else {
      const newSecret = await prisma.$transaction(async (tx) => {
        const secret = await tx.secret.create({
          data: {
            key,
            encryptedValue: encrypted.encryptedValue,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            version: 1,
            environmentId: metadata.environmentId!,
          },
        });

        await tx.secretVersion.create({
          data: {
            secretId: secret.id,
            version: 1,
            encryptedValue: encrypted.encryptedValue,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            changeType: "CREATED",
            changeSource: "API",
          },
        });

        return secret;
      });

      await createAuditLog({
        action: "SECRET_CREATED",
        projectId: metadata.projectId,
        environmentId: metadata.environmentId,
        secretId: newSecret.id,
        actorType: "API_KEY",
        actorUserId: apiKey.userId,
        metadata: { key },
      });

      created.push(key);
    }
  }

  return { data: { updated, created } };
}
