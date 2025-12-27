import { ORPCError } from "@orpc/server";
import { z } from "zod";

import prisma from "@valspec/db";

import { protectedProcedure } from "../index";
import { requireEnvAccess, requireSecretAccess } from "../lib/ownership";
import { encryptSecret, decryptSecret } from "../lib/crypto";
import { resolveSecrets, buildInheritanceChain } from "../lib/inheritance";
import { createSecretSchema, updateSecretSchema } from "../schemas/secret";

const envIdSchema = z.object({ projectId: z.cuid(), envId: z.cuid() });
const secretIdSchema = z.object({ projectId: z.cuid(), envId: z.cuid(), secretId: z.cuid() });

export const secretsRouter = {
  list: protectedProcedure
    .input(envIdSchema)
    .use(async ({ context, next }, input) => {
      await requireEnvAccess(input.projectId, input.envId, context.session.user.id);
      return next({ context });
    })
    .handler(async ({ input }) => {
      // Get all environments in the project for inheritance chain
      const environments = await prisma.environment.findMany({
        where: { projectId: input.projectId },
        select: { id: true, name: true, inheritsFromId: true },
      });

      // Get inheritance chain for this environment
      const chain = buildInheritanceChain(input.envId, environments);

      // Get all secrets from environments in the chain
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

      const resolved = resolveSecrets(input.envId, environments, secrets);
      return resolved.map((secret) => ({
        id: secret.id,
        key: secret.key,
        version: secret.version,
        environmentId: secret.environmentId,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
        inherited: secret.inherited,
        sourceEnvironmentId: secret.sourceEnvironmentId,
        sourceEnvironmentName: secret.sourceEnvironmentName,
      }));
    }),

  get: protectedProcedure
    .input(secretIdSchema)
    .use(async ({ context, next }, input) => {
      await requireSecretAccess(
        input.projectId,
        input.envId,
        input.secretId,
        context.session.user.id,
      );
      return next({ context });
    })
    .handler(async ({ input }) => {
      const secret = await prisma.secret.findUniqueOrThrow({
        where: { id: input.secretId },
      });

      const decryptedValue = await decryptSecret({
        encryptedValue: secret.encryptedValue,
        iv: secret.iv,
        authTag: secret.authTag,
      });

      return {
        id: secret.id,
        key: secret.key,
        value: decryptedValue,
        version: secret.version,
        environmentId: secret.environmentId,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
      };
    }),

  create: protectedProcedure
    .input(z.object({ ...envIdSchema.shape, ...createSecretSchema.shape }))
    .use(async ({ context, next }, input) => {
      await requireEnvAccess(input.projectId, input.envId, context.session.user.id);
      return next({ context });
    })
    .handler(async ({ input }) => {
      // Check for duplicate key in this environment
      const existing = await prisma.secret.findFirst({
        where: { environmentId: input.envId, key: input.key },
      });

      if (existing) {
        throw new ORPCError("CONFLICT", {
          message: "Secret with this key already exists in this environment",
        });
      }

      const encrypted = await encryptSecret(input.value);

      const secret = await prisma.$transaction(async (tx) => {
        const newSecret = await tx.secret.create({
          data: {
            key: input.key,
            encryptedValue: encrypted.encryptedValue,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            version: 1,
            environmentId: input.envId,
          },
        });

        await tx.secretVersion.create({
          data: {
            secretId: newSecret.id,
            version: 1,
            encryptedValue: encrypted.encryptedValue,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            changeType: "CREATED",
            changeSource: "WEB",
          },
        });

        return newSecret;
      });

      return {
        id: secret.id,
        key: secret.key,
        version: secret.version,
        environmentId: secret.environmentId,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
      };
    }),

  update: protectedProcedure
    .input(z.object({ ...secretIdSchema.shape, ...updateSecretSchema.shape }))
    .use(async ({ context, next }, input) => {
      await requireSecretAccess(
        input.projectId,
        input.envId,
        input.secretId,
        context.session.user.id,
      );
      return next({ context });
    })
    .handler(async ({ input }) => {
      const currentSecret = await prisma.secret.findUniqueOrThrow({
        where: { id: input.secretId },
      });

      const encrypted = await encryptSecret(input.value);
      const newVersion = currentSecret.version + 1;

      const secret = await prisma.$transaction(async (tx) => {
        const updatedSecret = await tx.secret.update({
          where: { id: input.secretId },
          data: {
            encryptedValue: encrypted.encryptedValue,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            version: newVersion,
          },
        });

        await tx.secretVersion.create({
          data: {
            secretId: input.secretId,
            version: newVersion,
            encryptedValue: encrypted.encryptedValue,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            changeType: "UPDATED",
            changeSource: "WEB",
          },
        });

        return updatedSecret;
      });

      return {
        id: secret.id,
        key: secret.key,
        version: secret.version,
        environmentId: secret.environmentId,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
      };
    }),

  delete: protectedProcedure
    .input(secretIdSchema)
    .use(async ({ context, next }, input) => {
      await requireSecretAccess(
        input.projectId,
        input.envId,
        input.secretId,
        context.session.user.id,
      );
      return next({ context });
    })
    .handler(async ({ input }) => {
      const secret = await prisma.secret.findUniqueOrThrow({
        where: { id: input.secretId },
      });

      await prisma.$transaction(async (tx) => {
        // Create DELETED version record before deleting
        await tx.secretVersion.create({
          data: {
            secretId: input.secretId,
            version: secret.version + 1,
            encryptedValue: secret.encryptedValue,
            iv: secret.iv,
            authTag: secret.authTag,
            changeType: "DELETED",
            changeSource: "WEB",
          },
        });

        await tx.secret.delete({
          where: { id: input.secretId },
        });
      });

      return { success: true };
    }),
};
