import { Elysia, t } from "elysia";

import prisma from "@valspec/db";

import { DEFAULT_ENVIRONMENT_COLOR } from "../constants";
import { createAuditLog } from "../lib/audit";
import { detectCircularInheritance } from "../lib/inheritance";
import { getProject, getEnvironment } from "../lib/ownership";
import { slugify } from "../lib/utils";
import { sessionAuth } from "../plugins/session-auth";
import { createEnvironmentSchema, updateEnvironmentSchema } from "../schemas/environment";

export const environmentRoutes = new Elysia({ prefix: "/projects/:projectId/environments" })
  .use(sessionAuth)

  .get(
    "/",
    async ({ session, params, status }) => {
      const project = await getProject(params.projectId, session.user.id);
      if (!project) throw status(404, { code: "NOT_FOUND", message: "Project not found" });

      return prisma.environment.findMany({
        where: { projectId: params.projectId },
        orderBy: { createdAt: "asc" },
      });
    },
    { params: t.Object({ projectId: t.String() }) },
  )

  .get(
    "/:envId",
    async ({ session, params, status }) => {
      const env = await getEnvironment(params.projectId, params.envId, session.user.id);
      if (!env) throw status(404, { code: "NOT_FOUND", message: "Environment not found" });
      return env;
    },
    { params: t.Object({ projectId: t.String(), envId: t.String() }) },
  )

  .post(
    "/",
    async ({ session, params, body, status }) => {
      const project = await getProject(params.projectId, session.user.id);
      if (!project) throw status(404, { code: "NOT_FOUND", message: "Project not found" });

      const validation = createEnvironmentSchema.safeParse(body);
      if (!validation.success) {
        throw status(400, {
          code: "BAD_REQUEST",
          message: validation.error.issues[0]?.message ?? "Invalid input",
        });
      }

      const { name, color, inheritsFromId } = validation.data;
      const slug = slugify(name);
      if (!slug) throw status(400, { code: "BAD_REQUEST", message: "Invalid environment name" });

      const existing = await prisma.environment.findFirst({
        where: { projectId: params.projectId, slug },
      });
      if (existing)
        throw status(409, {
          code: "CONFLICT",
          message: "Environment with this name already exists",
        });

      if (inheritsFromId) {
        const parent = await prisma.environment.findFirst({
          where: { id: inheritsFromId, projectId: params.projectId },
        });
        if (!parent)
          throw status(400, { code: "BAD_REQUEST", message: "Invalid inheritance target" });
      }

      const environment = await prisma.environment.create({
        data: {
          name,
          slug,
          color: color ?? DEFAULT_ENVIRONMENT_COLOR,
          projectId: params.projectId,
          inheritsFromId: inheritsFromId ?? null,
        },
      });

      await createAuditLog({
        action: "ENVIRONMENT_CREATED",
        projectId: params.projectId,
        environmentId: environment.id,
        actorType: "USER",
        actorUserId: session.user.id,
        metadata: { name: environment.name },
      });

      return environment;
    },
    {
      params: t.Object({ projectId: t.String() }),
      body: t.Object({
        name: t.String(),
        color: t.Optional(t.String()),
        inheritsFromId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    },
  )

  .patch(
    "/:envId",
    async ({ session, params, body, status }) => {
      const env = await getEnvironment(params.projectId, params.envId, session.user.id);
      if (!env) throw status(404, { code: "NOT_FOUND", message: "Environment not found" });

      const validation = updateEnvironmentSchema.safeParse(body);
      if (!validation.success) {
        throw status(400, {
          code: "BAD_REQUEST",
          message: validation.error.issues[0]?.message ?? "Invalid input",
        });
      }

      const input = validation.data;
      const updates: {
        name?: string;
        slug?: string;
        color?: string;
        inheritsFromId?: string | null;
      } = {};

      if (input.name !== undefined) {
        const newSlug = slugify(input.name);
        if (!newSlug)
          throw status(400, { code: "BAD_REQUEST", message: "Invalid environment name" });

        const existing = await prisma.environment.findFirst({
          where: { projectId: params.projectId, slug: newSlug, NOT: { id: params.envId } },
        });
        if (existing)
          throw status(409, {
            code: "CONFLICT",
            message: "Environment with this name already exists",
          });

        updates.name = input.name;
        updates.slug = newSlug;
      }

      if (input.color !== undefined) updates.color = input.color;

      if (input.inheritsFromId !== undefined) {
        if (input.inheritsFromId === null) {
          updates.inheritsFromId = null;
        } else {
          if (input.inheritsFromId === params.envId) {
            throw status(400, {
              code: "BAD_REQUEST",
              message: "Environment cannot inherit from itself",
            });
          }

          const parent = await prisma.environment.findFirst({
            where: { id: input.inheritsFromId, projectId: params.projectId },
          });
          if (!parent)
            throw status(400, { code: "BAD_REQUEST", message: "Invalid inheritance target" });

          const allEnvs = await prisma.environment.findMany({
            where: { projectId: params.projectId },
            select: { id: true, inheritsFromId: true },
          });
          if (detectCircularInheritance(params.envId, input.inheritsFromId, allEnvs)) {
            throw status(400, { code: "BAD_REQUEST", message: "Circular inheritance detected" });
          }

          updates.inheritsFromId = input.inheritsFromId;
        }
      }

      if (Object.keys(updates).length === 0) {
        throw status(400, { code: "BAD_REQUEST", message: "No valid fields to update" });
      }

      const environment = await prisma.environment.update({
        where: { id: params.envId },
        data: updates,
      });

      await createAuditLog({
        action: "ENVIRONMENT_UPDATED",
        projectId: params.projectId,
        environmentId: environment.id,
        actorType: "USER",
        actorUserId: session.user.id,
        metadata: { updates },
      });

      return environment;
    },
    {
      params: t.Object({ projectId: t.String(), envId: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        color: t.Optional(t.String()),
        inheritsFromId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    },
  )

  .delete(
    "/:envId",
    async ({ session, params, status }) => {
      const env = await getEnvironment(params.projectId, params.envId, session.user.id);
      if (!env) throw status(404, { code: "NOT_FOUND", message: "Environment not found" });

      const dependents = await prisma.environment.findMany({
        where: { inheritsFromId: params.envId },
        select: { name: true },
      });
      if (dependents.length > 0) {
        throw status(400, {
          code: "BAD_REQUEST",
          message: `Cannot delete: ${dependents.map((e) => e.name).join(", ")} inherit from this environment`,
        });
      }

      await prisma.environment.delete({ where: { id: params.envId } });

      await createAuditLog({
        action: "ENVIRONMENT_DELETED",
        projectId: params.projectId,
        environmentId: params.envId,
        actorType: "USER",
        actorUserId: session.user.id,
        metadata: { name: env.name },
      });

      return { success: true };
    },
    { params: t.Object({ projectId: t.String(), envId: t.String() }) },
  );
