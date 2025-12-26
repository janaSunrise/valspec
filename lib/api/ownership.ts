import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db';
import type { Tables } from '@/types/database.types';

export type Project = Tables<'projects'>;
export type Environment = Tables<'environments'>;
export type Secret = Tables<'secrets'>;

// Verifies the user owns the project
export async function requireProjectAccess(
  projectId: string,
  userId: string
): Promise<{ project: Project } | { error: NextResponse }> {
  const supabase = await createServerSupabaseClient();

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (error || !project) {
    return {
      error: NextResponse.json({ error: 'Project not found' }, { status: 404 }),
    };
  }

  return { project };
}

// Verifies the user owns the project and the environment belongs to that project.
export async function requireEnvAccess(
  projectId: string,
  envId: string,
  userId: string
): Promise<{ project: Project; environment: Environment } | { error: NextResponse }> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*, environments!inner(*)')
    .eq('id', projectId)
    .eq('user_id', userId)
    .eq('environments.id', envId)
    .single();

  if (error || !data) {
    // Determine if project doesn't exist or environment doesn't exist
    const { data: projectOnly } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!projectOnly) {
      return {
        error: NextResponse.json({ error: 'Project not found' }, { status: 404 }),
      };
    }

    return {
      error: NextResponse.json({ error: 'Environment not found' }, { status: 404 }),
    };
  }

  const environments = data.environments as unknown as Environment[];
  const environment = environments[0];

  // Return project without the environments array
  const { environments: _, ...project } = data;

  return {
    project: project as Project,
    environment,
  };
}

// Verifies the user owns the project, the environment belongs to that project,
// and the secret belongs to that environment.
export async function requireSecretAccess(
  projectId: string,
  envId: string,
  secretId: string,
  userId: string
): Promise<
  { project: Project; environment: Environment; secret: Secret } | { error: NextResponse }
> {
  const supabase = await createServerSupabaseClient();

  const { data: secret, error } = await supabase
    .from('secrets')
    .select('*, environments!inner(*, projects!inner(*))')
    .eq('id', secretId)
    .eq('environment_id', envId)
    .eq('environments.project_id', projectId)
    .eq('environments.projects.user_id', userId)
    .single();

  if (error || !secret) {
    return {
      error: NextResponse.json({ error: 'Secret not found' }, { status: 404 }),
    };
  }

  const environmentWithProject = secret.environments as unknown as Environment & {
    projects: Project;
  };
  const project = environmentWithProject.projects;

  const { projects: _, ...environment } = environmentWithProject;
  const { environments: __, ...cleanSecret } = secret;

  return {
    project,
    environment: environment as Environment,
    secret: cleanSecret as Secret,
  };
}

// Fetches a project with all its environments.
export async function requireProjectWithEnvs(
  projectId: string,
  userId: string
): Promise<{ project: Project; environments: Environment[] } | { error: NextResponse }> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*, environments(*)')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return {
      error: NextResponse.json({ error: 'Project not found' }, { status: 404 }),
    };
  }

  const environments = (data.environments || []) as Environment[];
  const { environments: _, ...project } = data;

  return {
    project: project as Project,
    environments,
  };
}
