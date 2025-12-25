'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ResolvedSecret } from '@/lib/secrets/inheritance';

interface SecretFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  envId: string;
  secret?: ResolvedSecret | null;
}

export function SecretForm({ open, onOpenChange, projectId, envId, secret }: SecretFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

  const isEditing = !!secret;

  useEffect(() => {
    if (open && secret) {
      setKey(secret.key);
      setValue('');
      setIsFetching(true);
      fetch(`/api/projects/${projectId}/environments/${envId}/secrets/${secret.id}`)
        .then((res) => res.json())
        .then((data) => {
          setValue(data.value || '');
        })
        .finally(() => {
          setIsFetching(false);
        });
    } else if (open) {
      setKey('');
      setValue('');
    }
    setError('');
  }, [open, secret, projectId, envId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = isEditing
        ? `/api/projects/${projectId}/environments/${envId}/secrets/${secret.id}`
        : `/api/projects/${projectId}/environments/${envId}/secrets`;

      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { value } : { key, value }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong');
        return;
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit secret' : 'Add secret'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="key" className="text-sm font-medium">
              Key
            </label>
            <Input
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="API_KEY"
              disabled={isEditing || isLoading}
              className="font-mono"
            />
            {!isEditing && (
              <p className="text-xs text-muted-foreground">
                Uppercase letters, numbers, and underscores only
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="value" className="text-sm font-medium">
              Value
            </label>
            {isFetching ? (
              <div className="flex h-10 items-center justify-center rounded-md border">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Input
                id="value"
                type="password"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter secret value"
                disabled={isLoading}
                className="font-mono"
              />
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isFetching}>
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEditing ? (
                'Save changes'
              ) : (
                'Add secret'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
