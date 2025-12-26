import { FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const projects = [];

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <Button>New Project</Button>
      </div>

      {projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"></div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted ring-1 ring-border">
            <FolderOpen className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-medium">No projects yet</p>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            Create your first project to start managing secrets
          </p>
          <div className="mt-6">
            <Button>Create Project</Button>
          </div>
        </div>
      )}
    </>
  );
}
