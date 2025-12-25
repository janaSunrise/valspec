import { Plus } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const user = await getUser();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user?.name || 'there'}
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 size-4" />
          New project
        </Button>
      </div>

      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">No projects yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Create your first project to start managing secrets
        </p>
      </div>
    </div>
  );
}
