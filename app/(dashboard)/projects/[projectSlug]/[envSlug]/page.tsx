import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, GitFork } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { EnvironmentTabs } from '@/components/projects/environment-tabs';
import { ProjectActions } from '@/components/projects/project-actions';
import { EnvironmentActions } from '@/components/projects/environment-actions';
import { SecretsTable } from '@/components/secrets/secrets-table';
import { resolveSecrets } from '@/lib/secrets/inheritance';
import { ProjectProvider } from '@/contexts/project-context';
import { EnvironmentProvider } from '@/contexts/environment-context';

type Params = Promise<{ projectSlug: string; envSlug: string }>;

export default async function EnvironmentPage({ params }: { params: Params }) {
  const [{ projectSlug, envSlug }, user] = await Promise.all([params, getUser()]);

  if (!user) return null;

  const supabase = await createServerSupabaseClient();

  const { data: project } = await supabase
    .from('projects')
    .select('*, environments(*, secrets(*))')
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

  const allSecrets = environments.flatMap((e) => e.secrets || []);
  const resolvedSecrets = resolveSecrets(currentEnv.id, environments, allSecrets);

  // Find inherited environment if any
  const inheritedEnv = currentEnv.inherits_from_id
    ? environments.find((e) => e.id === currentEnv.inherits_from_id)
    : null;

  return (
    <ProjectProvider project={project} environments={environments}>
      <EnvironmentProvider environment={currentEnv} projectId={project.id}>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <Link
              href="/dashboard"
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Projects
            </Link>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
                  <span className="text-xl text-muted-foreground/50">/</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full ring-2 ring-background"
                      style={{ backgroundColor: currentEnv.color || '#6366f1' }}
                    />
                    <span className="text-xl font-medium text-foreground/70">{currentEnv.name}</span>
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                )}
              </div>
              <ProjectActions project={project} />
            </div>
          </div>

          {/* Environment Bar */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-4">
              <EnvironmentTabs
                projectId={project.id}
                projectSlug={projectSlug}
                environments={environments}
                activeEnvSlug={envSlug}
              />
              {inheritedEnv && (
                <div className="flex items-center gap-1.5 border-l border-border pl-4 text-xs text-muted-foreground">
                  <GitFork className="size-3" />
                  <span>
                    Inherits from{' '}
                    <span className="font-medium text-foreground/80">{inheritedEnv.name}</span>
                  </span>
                </div>
              )}
            </div>
            <EnvironmentActions
              projectId={project.id}
              projectSlug={projectSlug}
              environment={currentEnv}
              environments={environments}
            />
          </div>

          {/* Secrets */}
          <SecretsTable secrets={resolvedSecrets} projectId={project.id} envId={currentEnv.id} />
        </div>
      </EnvironmentProvider>
    </ProjectProvider>
  );
}
