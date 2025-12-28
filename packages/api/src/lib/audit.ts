import prisma, { type Prisma } from "@valspec/db";

import type { AuditAction, ActorType } from "@valspec/db";

type AuditParams = {
  action: AuditAction;
  projectId?: string;
  environmentId?: string;
  secretId?: string;
  actorType: ActorType;
  actorUserId?: string;
  actorId?: string;
  actorIp?: string;
  actorUserAgent?: string;
  metadata?: Record<string, unknown>;
};

export async function createAuditLog(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      projectId: params.projectId,
      environmentId: params.environmentId,
      secretId: params.secretId,
      actorType: params.actorType,
      actorUserId: params.actorUserId,
      actorId: params.actorId,
      actorIp: params.actorIp,
      actorUserAgent: params.actorUserAgent,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
