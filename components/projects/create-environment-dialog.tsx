'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ColorPicker } from './color-picker';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Plus, Loader2 } from 'lucide-react';
import { useCreateEnvironment } from '@/lib/hooks/use-environments';
import type { Tables } from '@/types/database.types';

type Environment = Tables<'environments'>;

interface CreateEnvironmentDialogProps {
  projectId: string;
  projectSlug: string;
  environments: Environment[];
  trigger?: React.ReactNode;
}

export function CreateEnvironmentDialog({
  projectId,
  projectSlug,
  environments,
  trigger,
}: CreateEnvironmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [inheritsFromId, setInheritsFromId] = useState<string>('none');
  const [error, setError] = useState('');

  const createEnvironment = useCreateEnvironment(projectId);

  const resetForm = () => {
    setName('');
    setColor('#3b82f6');
    setInheritsFromId('none');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const env = await createEnvironment.mutateAsync({
        name,
        color,
        inherits_from_id: inheritsFromId === 'none' ? null : inheritsFromId,
      });
      setOpen(false);
      resetForm();
      router.push(`/projects/${projectSlug}/${env.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create environment');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="mr-1.5 size-4" />
            Add environment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create environment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorAlert message={error} />

          <div className="space-y-1.5">
            <label
              htmlFor="env-name"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Name
            </label>
            <Input
              id="env-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="staging"
              required
              disabled={createEnvironment.isPending}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Color</label>
            <ColorPicker value={color} onChange={setColor} disabled={createEnvironment.isPending} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Inherits from
            </label>
            <Select value={inheritsFromId} onValueChange={setInheritsFromId} disabled={createEnvironment.isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {environments.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: env.color || '#6366f1' }}
                      />
                      {env.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Inherited secrets will be available in this environment
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={createEnvironment.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createEnvironment.isPending || !name.trim()}>
              {createEnvironment.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
