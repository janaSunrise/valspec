"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2, Plus, Frown, Upload, Download } from "lucide-react";
import { Link } from "next-view-transitions";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { EnvironmentTabs } from "@/components/environments/environment-tabs";
import { EnvironmentActions } from "@/components/environments/environment-actions";
import { ProjectActions } from "@/components/projects/project-actions";
import { SecretRow } from "@/components/secrets/secret-row";
import { SecretDialog } from "@/components/secrets/secret-dialog";
import { VersionHistory } from "@/components/secrets/version-history";
import { ExportDialog } from "@/components/secrets/export-dialog";
import { ImportDialog } from "@/components/secrets/import-dialog";
import { client, queryClient } from "@/utils/orpc";

import type { Secret } from "@/components/secrets/secret-row";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const envId = searchParams.get("env");

  // Dialog states
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<Secret | null>(null);
  const [historySecret, setHistorySecret] = useState<Secret | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery({
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

  const deleteSecret = useMutation({
    mutationFn: () =>
      client.secrets.delete({
        projectId,
        envId: activeEnv!.id,
        secretId: deletingSecret!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secrets", projectId, activeEnv?.id] });
      toast.success("Secret deleted");
      setDeletingSecret(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete secret");
    },
  });

  const handleAddSecret = () => {
    setEditingSecret(null);
    setSecretDialogOpen(true);
  };

  const handleEditSecret = (secret: Secret) => {
    setEditingSecret(secret);
    setSecretDialogOpen(true);
  };

  const handleSecretDialogClose = (open: boolean) => {
    setSecretDialogOpen(open);
    if (!open) setEditingSecret(null);
  };

  // Computed values
  const ownSecrets = secrets?.filter((s) => !s.inherited).length ?? 0;
  const inheritedSecrets = secrets?.filter((s) => s.inherited).length ?? 0;

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

  // Project has no environments
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

      {/* Secrets */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Secrets Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div>
            <span className="text-sm font-medium">Secrets</span>
            {!secretsLoading && secrets && secrets.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                {ownSecrets}
                {inheritedSecrets > 0 && (
                  <span className="text-muted-foreground"> · {inheritedSecrets} inherited</span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-1.5 size-3.5" />
              Import
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExportDialogOpen(true)}>
              <Download className="mr-1.5 size-3.5" />
              Export
            </Button>
            <Button size="sm" variant="outline" onClick={handleAddSecret}>
              <Plus className="mr-1.5 size-3.5" />
              Add
            </Button>
          </div>
        </div>

        {/* Secrets List */}
        {secretsLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : secrets && secrets.length > 0 ? (
          <div className="divide-y divide-border/50">
            {secrets.map((secret) => (
              <SecretRow
                key={secret.id}
                secret={secret}
                projectId={projectId}
                envId={activeEnv.id}
                onEdit={handleEditSecret}
                onDelete={setDeletingSecret}
                onViewHistory={setHistorySecret}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Frown className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">No secrets yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first secret to get started
            </p>
          </div>
        )}
      </div>

      {/* Secret Dialog (Add/Edit) */}
      <SecretDialog
        open={secretDialogOpen}
        onOpenChange={handleSecretDialogClose}
        projectId={projectId}
        envId={activeEnv.id}
        secret={editingSecret}
      />

      {/* Version History Dialog */}
      <VersionHistory
        open={!!historySecret}
        onOpenChange={(open) => !open && setHistorySecret(null)}
        projectId={projectId}
        envId={activeEnv.id}
        secret={historySecret}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSecret} onOpenChange={() => setDeletingSecret(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete secret?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">
                {deletingSecret?.key}
              </code>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSecret.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deleteSecret.mutate()}
              disabled={deleteSecret.isPending}
            >
              {deleteSecret.isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import/Export Dialogs */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        projectId={projectId}
        envId={activeEnv.id}
        envName={activeEnv.name}
      />
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        projectId={projectId}
        envId={activeEnv.id}
        envName={activeEnv.name}
      />
    </div>
  );
}
