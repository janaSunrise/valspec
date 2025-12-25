import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { EnvironmentTabs } from '@/components/projects/environment-tabs';
import { ProjectActions } from '@/components/projects/project-actions';
import { EnvironmentActions } from '@/components/projects/environment-actions';
import { CreateEnvironmentDialog } from '@/components/projects/create-environment-dialog';
import { SecretsTable } from '@/components/secrets/secrets-table';
import { resolveSecrets } from '@/lib/secrets/inheritance';

type Params = Promise<{ projectSlug: string; envSlug: string }>;

export default async function EnvironmentPage({ params }: { params: Params }) {
  const { projectSlug, envSlug } = await params;
  const user = await getUser();

  if (!user) return null;

  const supabase = await createServerSupabaseClient();

  const { data: project } = await supabase
    .from('projects')
    .select('*, environments(*)')
    .eq('slug', projectSlug)
    .eq('user_id', user.id)
    .single();

  if (!project) {
    notFound();
  }

  const environments = (project.environments || []).sort(
    (a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()
  );
  const currentEnv = environments.find((e) => e.slug === envSlug);

  if (!currentEnv) {
    notFound();
  }

  // Get all secrets for all environments in the project (for inheritance resolution)
  const envIds = environments.map((e) => e.id);
  const { data: allSecrets } = await supabase
    .from('secrets')
    .select('*')
    .in('environment_id', envIds);

  // Resolve secrets with inheritance
  const resolvedSecrets = resolveSecrets(currentEnv.id, environments, allSecrets || []);

  // Find inherited environment if any
  const inheritedEnv = currentEnv.inherits_from_id
    ? environments.find((e) => e.id === currentEnv.inherits_from_id)
    : null;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CreateEnvironmentDialog
              projectId={project.id}
              projectSlug={projectSlug}
              environments={environments}
            />
            <ProjectActions project={project} />
          </div>
        </div>
      </div>

      <EnvironmentTabs
        projectSlug={projectSlug}
        environments={environments}
        activeEnvSlug={envSlug}
      />

      <div className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: currentEnv.color || '#6366f1' }}
          />
          <span className="text-sm font-medium">{currentEnv.name}</span>
          {inheritedEnv && (
            <span className="text-xs text-muted-foreground">inherits from {inheritedEnv.name}</span>
          )}
          <EnvironmentActions
            projectId={project.id}
            projectSlug={projectSlug}
            environment={currentEnv}
            environments={environments}
          />
        </div>

        <SecretsTable secrets={resolvedSecrets} projectId={project.id} envId={currentEnv.id} />
      </div>
    </div>
  );
}
