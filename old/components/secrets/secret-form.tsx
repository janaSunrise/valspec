"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorAlert } from "@/components/ui/error-alert";
import { useCreateSecret, useUpdateSecret, useSecretValue } from "@/lib/hooks/use-secrets";
import type { ResolvedSecret } from "@/lib/secrets/inheritance";

interface SecretFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  envId: string;
  secret?: ResolvedSecret | null;
}

export function SecretForm({ open, onOpenChange, projectId, envId, secret }: SecretFormProps) {
  const [error, setError] = useState("");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const isEditing = !!secret;

  const createSecret = useCreateSecret(projectId, envId);
  const updateSecret = useUpdateSecret(projectId, envId, secret?.id ?? "");

  const { data: secretData, isLoading: isFetching } = useSecretValue(
    projectId,
    envId,
    open && secret ? secret.id : null,
  );

  useEffect(() => {
    if (open && secret) {
      setKey(secret.key);
      setValue("");
    } else if (open) {
      setKey("");
      setValue("");
    }
    setError("");
  }, [open, secret]);

  useEffect(() => {
    if (secretData?.value) {
      setValue(secretData.value);
    }
  }, [secretData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isEditing) {
        await updateSecret.mutateAsync({ value });
      } else {
        await createSecret.mutateAsync({ key, value });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const isLoading = createSecret.isPending || updateSecret.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit secret" : "Add secret"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorAlert message={error} />

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
                "Save changes"
              ) : (
                "Add secret"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
