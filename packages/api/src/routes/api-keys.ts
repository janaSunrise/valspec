import { Elysia, t } from "elysia";

import { auth } from "@valspec/auth";
import prisma from "@valspec/db";

import { createAuditLog } from "../lib/audit";
import { parseApiKeyMetadata } from "../lib/metadata";
import { getProject, getEnvironment } from "../lib/ownership";
import { sessionAuth } from "../plugins/session-auth";
import { createApiKeySchema, type ApiKeyMetadata } from "../schemas/api-key";

export const apiKeyRoutes = new Elysia({ prefix: "/api-keys" })
  .use(sessionAuth)

  .get(
    "/",
    async ({ session, query }) => {
      const apiKeys = await prisma.apikey.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      });

      const filtered = query.projectId
        ? apiKeys.filter((k) => parseApiKeyMetadata(k.metadata)?.projectId === query.projectId)
        : apiKeys;

      return filtered.map((k) => {
        const metadata = parseApiKeyMetadata(k.metadata);
        return {
          id: k.id,
          name: k.name ?? "",
          start: k.start ?? "",
          prefix: k.prefix,
          enabled: k.enabled ?? true,
          expiresAt: k.expiresAt,
          createdAt: k.createdAt,
          lastRequest: k.lastRequest,
          metadata: metadata ?? { projectId: "", permissions: [] },
        };
      });
    },
    { query: t.Object({ projectId: t.Optional(t.String()) }) },
  )

  .get(
    "/:keyId",
    async ({ session, params, status }) => {
      const apiKey = await prisma.apikey.findFirst({ where: { id: params.keyId, userId: session.user.id } });
      if (!apiKey) throw status(404, { code: "NOT_FOUND", message: "API key not found" });

      const metadata = parseApiKeyMetadata(apiKey.metadata);
      return {
        id: apiKey.id,
        name: apiKey.name ?? "",
        start: apiKey.start ?? "",
        prefix: apiKey.prefix,
        enabled: apiKey.enabled ?? true,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        lastRequest: apiKey.lastRequest,
        metadata: metadata ?? { projectId: "", permissions: [] },
      };
    },
    { params: t.Object({ keyId: t.String() }) },
  )

  .post(
    "/",
    async ({ session, body, status }) => {
      const validation = createApiKeySchema.safeParse(body);
      if (!validation.success) {
        throw status(400, { code: "BAD_REQUEST", message: validation.error.issues[0]?.message ?? "Invalid input" });
      }

      const input = validation.data;

      const project = await getProject(input.projectId, session.user.id);
      if (!project) throw status(404, { code: "NOT_FOUND", message: "Project not found" });

      if (input.environmentId) {
        const env = await getEnvironment(input.projectId, input.environmentId, session.user.id);
        if (!env) throw status(404, { code: "NOT_FOUND", message: "Environment not found" });
      }

      const metadata: ApiKeyMetadata = {
        projectId: input.projectId,
        environmentId: input.environmentId,
        permissions: input.permissions,
      };

      const expiresIn = input.expiresIn ? input.expiresIn * 24 * 60 * 60 : undefined;

      const apiKey = await auth.api.createApiKey({
        body: {
          name: input.name,
          userId: session.user.id,
          metadata,
          permissions: { secrets: input.permissions },
          expiresIn,
        },
      });

      if (!apiKey) throw status(500, { code: "INTERNAL_ERROR", message: "Failed to create API key" });

      await createAuditLog({
        action: "API_KEY_CREATED",
        projectId: input.projectId,
        environmentId: input.environmentId,
        actorType: "USER",
        actorUserId: session.user.id,
        metadata: { name: apiKey.name, keyId: apiKey.id },
      });

      return {
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        start: apiKey.start,
        prefix: apiKey.prefix,
        enabled: true,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        lastRequest: null,
        metadata,
      };
    },
    {
      body: t.Object({
        name: t.String(),
        projectId: t.String(),
        environmentId: t.Optional(t.String()),
        permissions: t.Optional(t.Array(t.String())),
        expiresIn: t.Optional(t.Number()),
      }),
    },
  )

  .patch(
    "/:keyId",
    async ({ session, params, body, status }) => {
      const existing = await prisma.apikey.findFirst({ where: { id: params.keyId, userId: session.user.id } });
      if (!existing) throw status(404, { code: "NOT_FOUND", message: "API key not found" });

      const updates: { name?: string; enabled?: boolean } = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.enabled !== undefined) updates.enabled = body.enabled;

      if (Object.keys(updates).length === 0) {
        throw status(400, { code: "BAD_REQUEST", message: "No valid fields to update" });
      }

      const apiKey = await prisma.apikey.update({ where: { id: params.keyId }, data: updates });
      const metadata = parseApiKeyMetadata(apiKey.metadata);

      return {
        id: apiKey.id,
        name: apiKey.name ?? "",
        start: apiKey.start ?? "",
        prefix: apiKey.prefix,
        enabled: apiKey.enabled ?? true,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        lastRequest: apiKey.lastRequest,
        metadata: metadata ?? { projectId: "", permissions: [] },
      };
    },
    {
      params: t.Object({ keyId: t.String() }),
      body: t.Object({ name: t.Optional(t.String()), enabled: t.Optional(t.Boolean()) }),
    },
  )

  .delete(
    "/:keyId",
    async ({ session, params, status }) => {
      const apiKey = await prisma.apikey.findFirst({ where: { id: params.keyId, userId: session.user.id } });
      if (!apiKey) throw status(404, { code: "NOT_FOUND", message: "API key not found" });

      const metadata = parseApiKeyMetadata(apiKey.metadata);
      await prisma.apikey.delete({ where: { id: params.keyId } });

      await createAuditLog({
        action: "API_KEY_REVOKED",
        projectId: metadata?.projectId,
        environmentId: metadata?.environmentId,
        actorType: "USER",
        actorUserId: session.user.id,
        metadata: { name: apiKey.name, keyId: apiKey.id },
      });

      return { success: true };
    },
    { params: t.Object({ keyId: t.String() }) },
  );
