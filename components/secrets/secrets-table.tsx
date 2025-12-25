'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { SecretRow } from './secret-row';
import { SecretForm } from './secret-form';
import type { ResolvedSecret } from '@/lib/secrets/inheritance';

interface SecretsTableProps {
  secrets: ResolvedSecret[];
  projectId: string;
  envId: string;
}

export function SecretsTable({ secrets, projectId, envId }: SecretsTableProps) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<ResolvedSecret | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<ResolvedSecret | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (secret: ResolvedSecret) => {
    setEditingSecret(secret);
    setIsFormOpen(true);
  };

  const handleDelete = (secret: ResolvedSecret) => {
    setDeletingSecret(secret);
  };

  const confirmDelete = async () => {
    if (!deletingSecret) return;

    setIsDeleting(true);
    try {
      await fetch(`/api/projects/${projectId}/environments/${envId}/secrets/${deletingSecret.id}`, {
        method: 'DELETE',
      });
      router.refresh();
    } finally {
      setIsDeleting(false);
      setDeletingSecret(null);
    }
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingSecret(null);
    }
  };

  const ownSecrets = secrets.filter((s) => !s.inherited).length;
  const inheritedSecrets = secrets.filter((s) => s.inherited).length;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-background ring-1 ring-border">
            <KeyRound className="size-4 text-foreground/60" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Environment Variables</h3>
            <p className="text-xs text-muted-foreground">
              {secrets.length === 0 ? (
                'No variables configured'
              ) : (
                <>
                  {ownSecrets} variable{ownSecrets !== 1 && 's'}
                  {inheritedSecrets > 0 && (
                    <span className="text-muted-foreground/70">
                      {' '}
                      · {inheritedSecrets} inherited
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-1.5 size-3.5" />
          Add variable
        </Button>
      </div>

      {/* Content */}
      {secrets.length > 0 ? (
        <div className="divide-y divide-border">
          {secrets.map((secret) => (
            <SecretRow
              key={secret.id}
              secret={secret}
              projectId={projectId}
              envId={envId}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted ring-1 ring-border">
            <ShieldCheck className="size-6 text-muted-foreground" />
          </div>
          <p className="mt-5 text-sm font-medium">No variables yet</p>
          <p className="mt-1.5 max-w-[240px] text-center text-xs text-muted-foreground">
            Store your environment variables, API keys, and secrets securely
          </p>
        </div>
      )}

      <SecretForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        projectId={projectId}
        envId={envId}
        secret={editingSecret}
      />

      <AlertDialog open={!!deletingSecret} onOpenChange={() => setDeletingSecret(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete secret</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {deletingSecret?.key}
              </code>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
