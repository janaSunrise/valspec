import type { Database } from '@/types/database.types';

type Environment = Database['public']['Tables']['environments']['Row'];
type Secret = Database['public']['Tables']['secrets']['Row'];

export interface ResolvedSecret {
  id: string;
  key: string;
  encrypted_value: string;
  iv: string;
  auth_tag: string;
  version: number;
  environment_id: string;
  created_at: string | null;
  updated_at: string | null;
  inherited: boolean;
  source_environment_id: string;
  source_environment_name?: string;
}

export function buildInheritanceChain(
  environmentId: string,
  environments: Environment[],
  maxDepth = 10
): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();
  let currentId: string | null = environmentId;
  let depth = 0;

  while (currentId && depth < maxDepth) {
    if (visited.has(currentId)) {
      console.warn('Circular inheritance detected in environment chain');
      break;
    }

    visited.add(currentId);
    chain.push(currentId);

    const env = environments.find((e) => e.id === currentId);
    currentId = env?.inherits_from_id || null;
    depth++;
  }

  return chain;
}

export function resolveSecrets(
  environmentId: string,
  environments: Environment[],
  allSecrets: Secret[]
): ResolvedSecret[] {
  const chain = buildInheritanceChain(environmentId, environments);
  const envMap = new Map(environments.map((e) => [e.id, e]));

  // Start from the root (end of chain) and work towards current environment
  // This way, child secrets override parent secrets
  const secretMap = new Map<string, ResolvedSecret>();

  for (let i = chain.length - 1; i >= 0; i--) {
    const envId = chain[i];
    const envSecrets = allSecrets.filter((s) => s.environment_id === envId);
    const isCurrentEnv = envId === environmentId;

    for (const secret of envSecrets) {
      secretMap.set(secret.key, {
        id: secret.id,
        key: secret.key,
        encrypted_value: secret.encrypted_value,
        iv: secret.iv,
        auth_tag: secret.auth_tag,
        version: secret.version,
        environment_id: secret.environment_id,
        created_at: secret.created_at,
        updated_at: secret.updated_at,
        inherited: !isCurrentEnv,
        source_environment_id: envId,
        source_environment_name: envMap.get(envId)?.name,
      });
    }
  }

  return Array.from(secretMap.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function getOwnSecrets(environmentId: string, allSecrets: Secret[]): Secret[] {
  return allSecrets.filter((s) => s.environment_id === environmentId);
}
