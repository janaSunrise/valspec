'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Secrets <span className="text-muted-foreground">({secrets.length})</span>
        </h3>
        <Button size="sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Add secret
        </Button>
      </div>

      {secrets.length > 0 ? (
        <div className="rounded-lg border border-border">
          {secrets.map((secret, i) => (
            <div
              key={secret.id}
              className={i !== secrets.length - 1 ? 'border-b border-border' : ''}
            >
              <SecretRow
                secret={secret}
                projectId={projectId}
                envId={envId}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No secrets yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Add your first secret to this environment
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
              <code className="rounded bg-muted px-1">{deletingSecret?.key}</code>? This action
              cannot be undone.
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
