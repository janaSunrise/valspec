import { ORPCError } from "@orpc/server";

import prisma from "@valspec/db";

/**
 * Verifies the user owns the project.
 * Throws NOT_FOUND if project doesn't exist or user doesn't own it.
 */
export async function requireProjectAccess(
  projectId: string,
  userId: string,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new ORPCError("NOT_FOUND", { message: "Project not found" });
  }

  return project;
}

/**
 * Verifies the user owns the project and the environment belongs to that project.
 * Throws NOT_FOUND if project or environment doesn't exist or user doesn't own them.
 */
export async function requireEnvAccess(
  projectId: string,
  envId: string,
  userId: string,
) {
  const environment = await prisma.environment.findFirst({
    where: {
      id: envId,
      projectId,
      project: { userId },
    },
    include: { project: true },
  });

  if (!environment) {
    throw new ORPCError("NOT_FOUND", { message: "Environment not found" });
  }

  const { project, ...env } = environment;
  return { project, environment: env };
}

/**
 * Verifies the user owns the project, the environment belongs to that project,
 * and the secret belongs to that environment.
 * Throws NOT_FOUND if any resource doesn't exist or user doesn't own them.
 */
export async function requireSecretAccess(
  projectId: string,
  envId: string,
  secretId: string,
  userId: string,
) {
  const secret = await prisma.secret.findFirst({
    where: {
      id: secretId,
      environmentId: envId,
      environment: {
        projectId,
        project: { userId },
      },
    },
    include: {
      environment: {
        include: { project: true },
      },
    },
  });

  if (!secret) {
    throw new ORPCError("NOT_FOUND", { message: "Secret not found" });
  }

  const { environment: envWithProject, ...secretData } = secret;
  const { project, ...environment } = envWithProject;

  return { project, environment, secret: secretData };
}

/**
 * Fetches a project with all its environments.
 * Throws NOT_FOUND if project doesn't exist or user doesn't own it.
 */
export async function requireProjectWithEnvs(
  projectId: string,
  userId: string,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      environments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) {
    throw new ORPCError("NOT_FOUND", { message: "Project not found" });
  }

  const { environments, ...projectData } = project;
  return { project: projectData, environments };
}
