import type { Environment, Secret } from "@valspec/db";

export interface ResolvedSecret {
  id: string;
  key: string;
  encryptedValue: string;
  iv: string;
  authTag: string;
  version: number;
  environmentId: string;
  createdAt: Date;
  updatedAt: Date;
  inherited: boolean;
  sourceEnvironmentId: string;
  sourceEnvironmentName?: string;
}

type EnvForChain = Pick<Environment, "id" | "inheritsFromId">;
type EnvForResolve = Pick<Environment, "id" | "name" | "inheritsFromId">;
type SecretForResolve = Pick<
  Secret,
  | "id"
  | "key"
  | "encryptedValue"
  | "iv"
  | "authTag"
  | "version"
  | "environmentId"
  | "createdAt"
  | "updatedAt"
>;

/**
 * Builds the inheritance chain for an environment.
 * Returns an array of environment IDs starting from the given environment
 * and traversing up the inheritance tree.
 */
export function buildInheritanceChain(
  environmentId: string,
  environments: EnvForChain[],
  maxDepth = 10,
): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();
  const envMap = new Map(environments.map((e) => [e.id, e]));

  let currentId: string | null = environmentId;
  let depth = 0;

  while (currentId && depth < maxDepth) {
    if (visited.has(currentId)) {
      break;
    }

    visited.add(currentId);
    chain.push(currentId);

    const env = envMap.get(currentId);
    currentId = env?.inheritsFromId ?? null;
    depth++;
  }

  return chain;
}

/**
 * Detects if setting a new parent would create circular inheritance.
 * Returns true if circular inheritance would occur.
 */
export function detectCircularInheritance(
  envId: string,
  newParentId: string,
  environments: EnvForChain[],
): boolean {
  const chain = buildInheritanceChain(newParentId, environments);
  return chain.includes(envId);
}

/**
 * Resolves secrets for an environment, including inherited secrets.
 * Child secrets override parent secrets with the same key.
 */
export function resolveSecrets(
  environmentId: string,
  environments: EnvForResolve[],
  allSecrets: SecretForResolve[],
): ResolvedSecret[] {
  const chain = buildInheritanceChain(environmentId, environments);
  const envMap = new Map(environments.map((e) => [e.id, e]));

  const secretsByEnv = new Map<string, SecretForResolve[]>();
  for (const secret of allSecrets) {
    const envSecrets = secretsByEnv.get(secret.environmentId) ?? [];
    envSecrets.push(secret);
    secretsByEnv.set(secret.environmentId, envSecrets);
  }

  // Start from root (end of chain) and work towards current environment
  // Child secrets override parent secrets
  const secretMap = new Map<string, ResolvedSecret>();

  for (let i = chain.length - 1; i >= 0; i--) {
    const envId = chain[i];
    const envSecrets = secretsByEnv.get(envId) ?? [];
    const isCurrentEnv = envId === environmentId;

    for (const secret of envSecrets) {
      secretMap.set(secret.key, {
        id: secret.id,
        key: secret.key,
        encryptedValue: secret.encryptedValue,
        iv: secret.iv,
        authTag: secret.authTag,
        version: secret.version,
        environmentId: secret.environmentId,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
        inherited: !isCurrentEnv,
        sourceEnvironmentId: envId,
        sourceEnvironmentName: envMap.get(envId)?.name,
      });
    }
  }

  return Array.from(secretMap.values()).sort((a, b) => a.key.localeCompare(b.key));
}
