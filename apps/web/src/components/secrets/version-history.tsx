"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { client, queryClient } from "@/utils/orpc";

import type { Secret } from "./secret-row";

const CHANGE_STYLES: Record<string, { label: string; className: string }> = {
  CREATED: { label: "Created", className: "text-emerald-500" },
  UPDATED: { label: "Updated", className: "text-blue-500" },
  DELETED: { label: "Deleted", className: "text-red-500" },
  ROLLBACK: { label: "Restored", className: "text-amber-500" },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface VersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  envId: string;
  secret: Secret | null;
}

export function VersionHistory({
  open,
  onOpenChange,
  projectId,
  envId,
  secret,
}: VersionHistoryProps) {
  const [rollbackVersionId, setRollbackVersionId] = useState<string | null>(null);
  const [rollbackVersion, setRollbackVersion] = useState<number | null>(null);

  const sourceEnvId = secret?.sourceEnvironmentId ?? envId;

  const { data: versions, isLoading } = useQuery({
    queryKey: ["versions", projectId, sourceEnvId, secret?.id],
    queryFn: () =>
      client.versions.list({
        projectId,
        envId: sourceEnvId,
        secretId: secret!.id,
      }),
    enabled: open && !!secret,
  });

  const rollback = useMutation({
    mutationFn: (versionId: string) =>
      client.versions.rollback({
        projectId,
        envId: sourceEnvId,
        secretId: secret!.id,
        versionId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secrets", projectId, envId] });
      queryClient.invalidateQueries({ queryKey: ["versions", projectId, sourceEnvId, secret?.id] });
      queryClient.invalidateQueries({ queryKey: ["secret-value"] });
      toast.success(`Restored to v${rollbackVersion}`);
      setRollbackVersionId(null);
      setRollbackVersion(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to restore version");
    },
  });

  const handleRollbackClick = (versionId: string, version: number) => {
    setRollbackVersionId(versionId);
    setRollbackVersion(version);
  };

  const confirmRollback = () => {
    if (rollbackVersionId) {
      rollback.mutate(rollbackVersionId);
    }
  };

  const currentVersion = versions?.[0]?.version ?? 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xs gap-0 p-0">
          <DialogHeader className="px-4 pb-2 pt-4">
            <DialogTitle className="font-mono text-sm font-medium">{secret?.key}</DialogTitle>
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto px-2 pb-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : versions && versions.length > 0 ? (
              <div className="space-y-0.5">
                {versions.map((version) => {
                  const style = CHANGE_STYLES[version.changeType] ?? CHANGE_STYLES.UPDATED;
                  const isLatest = version.version === currentVersion;
                  const canRollback = !isLatest && version.changeType !== "DELETED";

                  return (
                    <div
                      key={version.id}
                      className={cn(
                        "group flex items-center justify-between rounded-md px-2 py-2",
                        canRollback && "cursor-pointer hover:bg-muted/50",
                      )}
                      onClick={() =>
                        canRollback && handleRollbackClick(version.id, version.version)
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-xs font-medium text-muted-foreground">
                          v{version.version}
                        </span>
                        <span className={cn("text-xs font-medium", style.className)}>
                          {style.label}
                        </span>
                        {isLatest && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            Latest
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {formatRelativeTime(version.createdAt.toString())}
                        </span>
                        {canRollback && (
                          <RotateCcw className="size-3 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No version history
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!rollbackVersionId}
        onOpenChange={() => {
          setRollbackVersionId(null);
          setRollbackVersion(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore to v{rollbackVersion}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {secret?.key}
              </code>{" "}
              to version {rollbackVersion}. A new version will be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rollback.isPending}>Cancel</AlertDialogCancel>
            <Button onClick={confirmRollback} disabled={rollback.isPending}>
              {rollback.isPending ? <Loader2 className="size-4 animate-spin" /> : "Restore"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
