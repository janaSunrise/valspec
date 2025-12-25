import { createServerSupabaseClient } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { ProjectCard } from '@/components/projects/project-card';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';

export default async function DashboardPage() {
  const user = await getUser();
  const supabase = await createServerSupabaseClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('*, environments(count)')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user?.name || 'there'}
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No projects yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Create your first project to start managing secrets
          </p>
        </div>
      )}
    </div>
  );
}
