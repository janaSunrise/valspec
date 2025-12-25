import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Layers } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { EnvironmentTabs } from '@/components/projects/environment-tabs';
import { ProjectActions } from '@/components/projects/project-actions';
import { CreateEnvironmentDialog } from '@/components/projects/create-environment-dialog';

type Params = Promise<{ projectSlug: string }>;

export default async function ProjectPage({ params }: { params: Params }) {
  const { projectSlug } = await params;
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

  // Redirect to first environment if exists
  if (environments.length > 0) {
    redirect(`/projects/${projectSlug}/${environments[0].slug}`);
  }

  return (
    <div>
      <div className="mb-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Projects
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="mt-1.5 text-sm text-muted-foreground/70">{project.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ProjectActions project={project} />
          </div>
        </div>
      </div>

      <div className="mb-8">
        <EnvironmentTabs
          projectId={project.id}
          projectSlug={projectSlug}
          environments={environments}
        />
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-16">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted/50">
          <Layers className="size-5 text-muted-foreground/60" />
        </div>
        <p className="mt-4 text-sm font-medium text-muted-foreground">No environments yet</p>
        <p className="mt-1 text-center text-xs text-muted-foreground/60">
          Create an environment to start adding secrets
        </p>
        <div className="mt-6">
          <CreateEnvironmentDialog
            projectId={project.id}
            projectSlug={projectSlug}
            environments={environments}
          />
        </div>
      </div>
    </div>
  );
}
