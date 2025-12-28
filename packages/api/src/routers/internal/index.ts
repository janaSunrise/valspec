import { projectsRouter } from "./projects";
import { environmentsRouter } from "./environments";
import { secretsRouter } from "./secrets";
import { apiKeysRouter } from "./api-keys";
import { auditRouter } from "./audit";
import { versionsRouter } from "./versions";

export const internalRouter = {
  projects: projectsRouter,
  environments: environmentsRouter,
  secrets: secretsRouter,
  apiKeys: apiKeysRouter,
  audit: auditRouter,
  versions: versionsRouter,
};
