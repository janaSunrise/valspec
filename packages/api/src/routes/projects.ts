import { Elysia, t } from "elysia";

import prisma from "@valspec/db";

import { DEVELOPMENT_ENV_COLOR } from "../constants";
import { createAuditLog } from "../lib/audit";
import { getProject, getProjectWithEnvs } from "../lib/ownership";
import { slugify } from "../lib/utils";
import { sessionAuth } from "../plugins/session-auth";
import { createProjectSchema, updateProjectSchema } from "../schemas/project";

export const projectRoutes = new Elysia({ prefix: "/projects" })
  .use(sessionAuth)

  .get("/", async ({ session }) => {
    return prisma.project.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { environments: true } },
        environments: { select: { id: true, name: true, slug: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  })

  .get(
    "/:projectId",
    async ({ session, params, status }) => {
      const project = await getProjectWithEnvs(params.projectId, session.user.id);
      if (!project) throw status(404, { code: "NOT_FOUND", message: "Project not found" });
      return project;
    },
    { params: t.Object({ projectId: t.String() }) },
  )

  .post(
    "/",
    async ({ session, body, status }) => {
      const validation = createProjectSchema.safeParse(body);
      if (!validation.success) {
        throw status(400, { code: "BAD_REQUEST", message: validation.error.issues[0]?.message ?? "Invalid input" });
      }

      const { name, description } = validation.data;
      const slug = slugify(name);
      if (!slug) throw status(400, { code: "BAD_REQUEST", message: "Invalid project name" });

      const existing = await prisma.project.findFirst({ where: { userId: session.user.id, slug } });
      if (existing) throw status(409, { code: "CONFLICT", message: "Project with this name already exists" });

      const project = await prisma.$transaction(async (tx) => {
        const newProject = await tx.project.create({
          data: { name, slug, description: description ?? null, userId: session.user.id },
        });
        await tx.environment.create({
          data: { name: "Development", slug: "development", color: DEVELOPMENT_ENV_COLOR, projectId: newProject.id },
        });
        return newProject;
      });

      await createAuditLog({
        action: "PROJECT_CREATED",
        projectId: project.id,
        actorType: "USER",
        actorUserId: session.user.id,
        metadata: { name: project.name },
      });

      return project;
    },
    { body: t.Object({ name: t.String(), description: t.Optional(t.String()) }) },
  )

  .patch(
    "/:projectId",
    async ({ session, params, body, status }) => {
      const project = await getProject(params.projectId, session.user.id);
      if (!project) throw status(404, { code: "NOT_FOUND", message: "Project not found" });

      const validation = updateProjectSchema.safeParse(body);
      if (!validation.success) {
        throw status(400, { code: "BAD_REQUEST", message: validation.error.issues[0]?.message ?? "Invalid input" });
      }

      const input = validation.data;
      const updates: { name?: string; slug?: string; description?: string | null } = {};

      if (input.name !== undefined) {
        const newSlug = slugify(input.name);
        if (!newSlug) throw status(400, { code: "BAD_REQUEST", message: "Invalid project name" });

        const existing = await prisma.project.findFirst({
          where: { userId: session.user.id, slug: newSlug, NOT: { id: params.projectId } },
        });
        if (existing) throw status(409, { code: "CONFLICT", message: "Project with this name already exists" });

        updates.name = input.name;
        updates.slug = newSlug;
      }

      if (input.description !== undefined) {
        updates.description = input.description ?? null;
      }

      if (Object.keys(updates).length === 0) {
        throw status(400, { code: "BAD_REQUEST", message: "No valid fields to update" });
      }

      const updated = await prisma.project.update({ where: { id: params.projectId }, data: updates });

      await createAuditLog({
        action: "PROJECT_UPDATED",
        projectId: updated.id,
        actorType: "USER",
        actorUserId: session.user.id,
        metadata: { updates },
      });

      return updated;
    },
    {
      params: t.Object({ projectId: t.String() }),
      body: t.Object({ name: t.Optional(t.String()), description: t.Optional(t.Union([t.String(), t.Null()])) }),
    },
  )

  .delete(
    "/:projectId",
    async ({ session, params, status }) => {
      const project = await getProject(params.projectId, session.user.id);
      if (!project) throw status(404, { code: "NOT_FOUND", message: "Project not found" });

      await prisma.project.delete({ where: { id: params.projectId } });

      await createAuditLog({
        action: "PROJECT_DELETED",
        projectId: params.projectId,
        actorType: "USER",
        actorUserId: session.user.id,
        metadata: { name: project.name },
      });

      return { success: true };
    },
    { params: t.Object({ projectId: t.String() }) },
  );
