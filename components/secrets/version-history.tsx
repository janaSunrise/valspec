'use client';

import { useState } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRollbackSecret } from '@/lib/hooks/use-secrets';
import { cn } from '@/lib/utils';

interface Version {
  id: string;
  version: number;
  changeType: string;
  changeSource: string;
  createdAt: string;
}

interface VersionHistoryProps {
  secretId: string;
  secretKey: string;
  currentVersion: number;
  versions: Version[];
  projectId: string;
  envId: string;
}

const changeTypeConfig: Record<string, { label: string; color: string }> = {
  created: { label: 'Created', color: 'text-emerald-400' },
  updated: { label: 'Updated', color: 'text-blue-400' },
  deleted: { label: 'Deleted', color: 'text-red-400' },
  rollback: { label: 'Restored', color: 'text-amber-400' },
};

export function VersionHistory({
  secretId,
  secretKey,
  currentVersion,
  versions,
  projectId,
  envId,
}: VersionHistoryProps) {
  const [rollbackVersion, setRollbackVersion] = useState<Version | null>(null);

  const rollbackSecret = useRollbackSecret(projectId, envId, secretId);

  const handleRollback = async () => {
    if (!rollbackVersion) return;

    try {
      await rollbackSecret.mutateAsync(rollbackVersion.id);
      setRollbackVersion(null);
    } catch {
      // Error is handled by the mutation
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-sm text-muted-foreground">No version history yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        {versions.map((version) => {
          const config = changeTypeConfig[version.changeType] || changeTypeConfig.updated;
          const isLatest = version.version === currentVersion;
          const canRollback = !isLatest && version.changeType !== 'deleted';

          return (
            <div
              key={version.id}
              className={cn(
                'group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors',
                canRollback ? 'hover:bg-muted/50 cursor-pointer' : ''
              )}
              onClick={() => canRollback && setRollbackVersion(version)}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 text-sm font-medium text-foreground/80">
                  v{version.version}
                </span>

                <div className="flex items-center gap-2">
                  {isLatest && (
                    <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Latest
                    </span>
                  )}
                  <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className="text-xs text-muted-foreground"
                  title={formatDate(version.createdAt)}
                >
                  {formatRelativeTime(version.createdAt)}
                </span>

                {canRollback && (
                  <RotateCcw className="size-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!rollbackVersion} onOpenChange={() => setRollbackVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore to v{rollbackVersion?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">
                {secretKey}
              </code>{' '}
              to version {rollbackVersion?.version}. A new version will be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rollbackSecret.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback} disabled={rollbackSecret.isPending}>
              {rollbackSecret.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
