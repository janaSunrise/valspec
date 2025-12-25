import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/db';
import { EnvironmentTabs } from '@/components/projects/environment-tabs';
import { ProjectActions } from '@/components/projects/project-actions';
import { CreateEnvironmentDialog } from '@/components/projects/create-environment-dialog';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Params = Promise<{ projectSlug: string }>;

export default async function ProjectPage({ params }: { params: Params }) {
  const { projectSlug } = await params;
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

  // Redirect to first environment if exists
  if (environments.length > 0) {
    redirect(`/projects/${projectSlug}/${environments[0].slug}`);
  }

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

      <EnvironmentTabs projectSlug={projectSlug} environments={environments} />

      <div className="mt-8 rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">No environments yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Create an environment to start adding secrets
        </p>
      </div>
    </div>
  );
}
