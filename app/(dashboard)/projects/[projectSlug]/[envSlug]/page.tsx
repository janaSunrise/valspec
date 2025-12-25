import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db';
import { EnvironmentTabs } from '@/components/projects/environment-tabs';
import { ProjectActions } from '@/components/projects/project-actions';
import { EnvironmentActions } from '@/components/projects/environment-actions';
import { CreateEnvironmentDialog } from '@/components/projects/create-environment-dialog';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Params = Promise<{ projectSlug: string; envSlug: string }>;

export default async function EnvironmentPage({ params }: { params: Params }) {
  const { projectSlug, envSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: project } = await supabase
    .from('projects')
    .select('*, environments(*)')
    .eq('slug', projectSlug)
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

  // Get secrets for this environment
  const { data: secrets } = await supabase
    .from('secrets')
    .select('*')
    .eq('environment_id', currentEnv.id)
    .order('key', { ascending: true });

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
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: currentEnv.color || '#6366f1' }}
            />
            <span className="text-sm font-medium">{currentEnv.name}</span>
            {inheritedEnv && (
              <span className="text-xs text-muted-foreground">
                inherits from {inheritedEnv.name}
              </span>
            )}
            <EnvironmentActions
              projectId={project.id}
              projectSlug={projectSlug}
              environment={currentEnv}
              environments={environments}
            />
          </div>
          <Button size="sm">
            <Plus className="mr-1.5 size-4" />
            Add secret
          </Button>
        </div>

        {secrets && secrets.length > 0 ? (
          <div className="rounded-lg border border-border">
            {secrets.map((secret, i) => (
              <div
                key={secret.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i !== secrets.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <code className="text-sm font-medium">{secret.key}</code>
                <span className="text-sm text-muted-foreground">{'•'.repeat(16)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">No secrets yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Add your first secret to this environment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
