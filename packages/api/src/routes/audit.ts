import { Elysia, t } from "elysia";

import prisma, { AuditAction } from "@valspec/db";

import { getProject } from "../lib/ownership";
import { sessionAuth } from "../plugins/session-auth";

export const auditRoutes = new Elysia({ prefix: "/projects/:projectId/audit" })
  .use(sessionAuth)

  .get(
    "/",
    async ({ session, params, query, status }) => {
      const project = await getProject(params.projectId, session.user.id);
      if (!project) throw status(404, { code: "NOT_FOUND", message: "Project not found" });

      const { environmentId, action, limit = 100 } = query;

      const where: { projectId: string; environmentId?: string; action?: AuditAction } = {
        projectId: params.projectId,
      };
      if (environmentId) where.environmentId = environmentId;
      if (action && Object.values(AuditAction).includes(action as AuditAction)) {
        where.action = action as AuditAction;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        take: Math.min(Math.max(1, limit), 100),
        orderBy: { createdAt: "desc" },
        include: { environment: { select: { id: true, name: true, slug: true } } },
      });

      return logs.map((log) => ({
        id: log.id,
        action: log.action,
        actorType: log.actorType,
        actorUserId: log.actorUserId,
        actorId: log.actorId,
        environmentId: log.environmentId,
        environmentName: log.environment?.name ?? null,
        secretId: log.secretId,
        metadata: log.metadata as Record<string, unknown> | null,
        createdAt: log.createdAt,
      }));
    },
    {
      params: t.Object({ projectId: t.String() }),
      query: t.Object({
        environmentId: t.Optional(t.String()),
        action: t.Optional(t.String()),
        limit: t.Optional(t.Number()),
      }),
    },
  );
