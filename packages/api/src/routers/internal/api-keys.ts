import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { auth } from "@valspec/auth";
import prisma from "@valspec/db";

import { protectedProcedure } from "../../procedures";
import { createAuditLog } from "../../lib/audit";
import { parseApiKeyMetadata } from "../../lib/metadata";
import { requireEnvAccess, requireProjectAccess } from "../../lib/ownership";
import type { ApiKeyMetadata } from "../../schemas/api-key";
import { apiKeyIdSchema, createApiKeySchema, listApiKeysSchema } from "../../schemas/api-key";

export const apiKeysRouter = {
  list: protectedProcedure.input(listApiKeysSchema).handler(async ({ context, input }) => {
    const userId = context.session.user.id;

    const apiKeys = await prisma.apikey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const filteredKeys = input.projectId
      ? apiKeys.filter((key) => {
          const metadata = parseApiKeyMetadata(key.metadata);
          return metadata?.projectId === input.projectId;
        })
      : apiKeys;

    return filteredKeys.map((key) => {
      const metadata = parseApiKeyMetadata(key.metadata);

      return {
        id: key.id,
        name: key.name,
        start: key.start,
        prefix: key.prefix,
        enabled: key.enabled ?? true,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
        lastRequest: key.lastRequest,
        metadata,
      };
    });
  }),

  create: protectedProcedure.input(createApiKeySchema).handler(async ({ context, input }) => {
    const userId = context.session.user.id;

    await requireProjectAccess(input.projectId, userId);

    if (input.environmentId) {
      await requireEnvAccess(input.projectId, input.environmentId, userId);
    }

    const metadata: ApiKeyMetadata = {
      projectId: input.projectId,
      environmentId: input.environmentId,
      permissions: input.permissions,
    };

    const permissions: Record<string, string[]> = {
      secrets: input.permissions,
    };

    const expiresIn = input.expiresIn ? input.expiresIn * 24 * 60 * 60 : undefined;

    const apiKey = await auth.api.createApiKey({
      body: {
        name: input.name,
        userId,
        metadata,
        permissions,
        expiresIn,
      },
    });

    if (!apiKey) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create API key",
      });
    }

    await createAuditLog({
      action: "API_KEY_CREATED",
      projectId: input.projectId,
      environmentId: input.environmentId,
      actorType: "USER",
      actorUserId: userId,
      metadata: { name: apiKey.name, keyId: apiKey.id },
    });

    return {
      id: apiKey.id,
      key: apiKey.key,
      name: apiKey.name,
      start: apiKey.start,
      prefix: apiKey.prefix,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      metadata,
    };
  }),

  get: protectedProcedure.input(apiKeyIdSchema).handler(async ({ context, input }) => {
    const userId = context.session.user.id;

    const apiKey = await prisma.apikey.findFirst({
      where: {
        id: input.keyId,
        userId,
      },
    });

    if (!apiKey) {
      throw new ORPCError("NOT_FOUND", { message: "API key not found" });
    }

    const metadata = parseApiKeyMetadata(apiKey.metadata);

    return {
      id: apiKey.id,
      name: apiKey.name,
      start: apiKey.start,
      prefix: apiKey.prefix,
      enabled: apiKey.enabled ?? true,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      lastRequest: apiKey.lastRequest,
      metadata,
    };
  }),

  revoke: protectedProcedure.input(apiKeyIdSchema).handler(async ({ context, input }) => {
    const userId = context.session.user.id;

    // Verify the API key belongs to the user
    const apiKey = await prisma.apikey.findFirst({
      where: {
        id: input.keyId,
        userId,
      },
    });

    if (!apiKey) {
      throw new ORPCError("NOT_FOUND", { message: "API key not found" });
    }

    const metadata = parseApiKeyMetadata(apiKey.metadata);

    await prisma.apikey.delete({
      where: { id: input.keyId },
    });

    await createAuditLog({
      action: "API_KEY_REVOKED",
      projectId: metadata?.projectId,
      environmentId: metadata?.environmentId,
      actorType: "USER",
      actorUserId: userId,
      metadata: { name: apiKey.name, keyId: apiKey.id },
    });

    return { success: true };
  }),

  update: protectedProcedure
    .input(
      z.object({
        keyId: z.string().min(1),
        name: z.string().min(1).max(100).optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const existing = await prisma.apikey.findFirst({
        where: {
          id: input.keyId,
          userId,
        },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "API key not found" });
      }

      const updates: { name?: string; enabled?: boolean } = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.enabled !== undefined) updates.enabled = input.enabled;

      if (Object.keys(updates).length === 0) {
        throw new ORPCError("BAD_REQUEST", { message: "No valid fields to update" });
      }

      const apiKey = await prisma.apikey.update({
        where: { id: input.keyId },
        data: updates,
      });

      const metadata = parseApiKeyMetadata(apiKey.metadata);

      return {
        id: apiKey.id,
        name: apiKey.name,
        start: apiKey.start,
        prefix: apiKey.prefix,
        enabled: apiKey.enabled ?? true,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        lastRequest: apiKey.lastRequest,
        metadata,
      };
    }),
};
