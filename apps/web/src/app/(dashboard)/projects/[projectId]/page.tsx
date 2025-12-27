"use client";

import { use, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2, Lock, KeyRound } from "lucide-react";
import { Link } from "next-view-transitions";

import { Button } from "@/components/ui/button";
import { EnvironmentTabs } from "@/components/environments/environment-tabs";
import { EnvironmentActions } from "@/components/environments/environment-actions";
import { ProjectActions } from "@/components/projects/project-actions";
import { client } from "@/utils/orpc";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const envId = searchParams.get("env");

  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => client.projects.get({ projectId }),
  });

  // Determine the active environment
  const activeEnv = useMemo(() => {
    if (!project?.environments?.length) return null;
    if (envId) {
      return project.environments.find((e) => e.id === envId) ?? project.environments[0];
    }
    return project.environments[0];
  }, [project?.environments, envId]);

  // Auto-redirect to first environment if none selected
  useEffect(() => {
    if (project?.environments?.length && !envId) {
      router.replace(`/projects/${projectId}?env=${project.environments[0].id}`);
    }
  }, [project?.environments, envId, projectId, router]);

  const { data: secrets, isLoading: secretsLoading } = useQuery({
    queryKey: ["secrets", projectId, activeEnv?.id],
    queryFn: () => client.secrets.list({ projectId, envId: activeEnv!.id }),
    enabled: !!activeEnv,
  });

  if (projectLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ChevronLeft className="mr-1.5 size-4" />
            Back to dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // Project has no environments (unlikely but possible)
  if (!project.environments?.length || !activeEnv) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon-sm">
                <ChevronLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
              {project.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>
          <ProjectActions project={project} />
        </div>

        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">No environments found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an environment to start managing secrets
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon-sm">
              <ChevronLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>
        <ProjectActions project={project} />
      </div>

      {/* Environment Tabs */}
      <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
        <EnvironmentTabs
          projectId={projectId}
          environments={project.environments}
          activeEnvId={activeEnv.id}
        />
        <EnvironmentActions
          projectId={projectId}
          environment={activeEnv}
          environments={project.environments}
        />
      </div>

      {/* Secrets List */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-3.5" />
            <span>Secrets</span>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {secretsLoading ? "..." : `${secrets?.length ?? 0} secret${(secrets?.length ?? 0) !== 1 ? "s" : ""}`}
          </span>
        </div>

        {secretsLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : secrets && secrets.length > 0 ? (
          <div className="divide-y divide-border">
            {secrets.map((secret) => (
              <div
                key={secret.id}
                className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <KeyRound className="size-4 text-muted-foreground" />
                  <div>
                    <code className="text-sm font-medium">{secret.key}</code>
                    {secret.inherited && secret.sourceEnvironmentName && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Inherited from {secret.sourceEnvironmentName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">v{secret.version}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm text-muted-foreground">No secrets yet</p>
            <p className="text-xs text-muted-foreground">
              Add your first secret to this environment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
