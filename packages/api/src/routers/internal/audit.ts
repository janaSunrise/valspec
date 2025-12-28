import { z } from "zod";

import prisma, { type Prisma, AuditAction } from "@valspec/db";

import { protectedProcedure } from "../../procedures";
import { requireProjectAccess } from "../../lib/ownership";
import { cuidSchema } from "../../schemas";

const listAuditLogsSchema = z.object({
  projectId: cuidSchema,
  environmentId: cuidSchema.optional(),
  action: z.nativeEnum(AuditAction).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export const auditRouter = {
  list: protectedProcedure
    .input(listAuditLogsSchema)
    .use(async ({ context, next }, input) => {
      await requireProjectAccess(input.projectId, context.session.user.id);
      return next({ context });
    })
    .handler(async ({ input }) => {
      const { projectId, environmentId, action, startDate, endDate, limit, cursor } = input;

      const where: Prisma.AuditLogWhereInput = { projectId };

      if (environmentId) {
        where.environmentId = environmentId;
      }

      if (action) {
        where.action = action;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          environment: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (logs.length > limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem?.id;
      }

      return {
        logs: logs.map((log) => ({
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
        })),
        nextCursor,
      };
    }),
};
