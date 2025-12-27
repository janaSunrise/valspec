"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { client, queryClient } from "@/utils/orpc";

import type { Secret } from "./secret-row";

interface SecretDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  envId: string;
  secret?: Secret | null;
}

export function SecretDialog({ open, onOpenChange, projectId, envId, secret }: SecretDialogProps) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [showValue, setShowValue] = useState(false);

  const isEditing = !!secret;

  // Fetch current value when editing
  const { data: secretData, isLoading: isFetchingValue } = useQuery({
    queryKey: ["secret-value", projectId, envId, secret?.id],
    queryFn: () => client.secrets.get({ projectId, envId, secretId: secret!.id }),
    enabled: open && isEditing,
  });

  // Reset form when dialog opens/closes or secret changes
  useEffect(() => {
    if (open) {
      if (secret) {
        setKey(secret.key);
        setValue("");
      } else {
        setKey("");
        setValue("");
      }
      setShowValue(false);
    }
  }, [open, secret]);

  // Populate value when fetched
  useEffect(() => {
    if (secretData?.value) {
      setValue(secretData.value);
    }
  }, [secretData]);

  const createSecret = useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      client.secrets.create({ projectId, envId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secrets", projectId, envId] });
      toast.success("Secret created");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create secret");
    },
  });

  const updateSecret = useMutation({
    mutationFn: (data: { value: string }) =>
      client.secrets.update({ projectId, envId, secretId: secret!.id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secrets", projectId, envId] });
      queryClient.invalidateQueries({ queryKey: ["secret-value", projectId, envId, secret?.id] });
      toast.success("Secret updated");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update secret");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateSecret.mutate({ value });
    } else {
      createSecret.mutate({ key: key.trim(), value });
    }
  };

  const isLoading = createSecret.isPending || updateSecret.isPending;
  const isFormValid = isEditing ? value.length > 0 : key.trim().length > 0 && value.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit secret" : "Add secret"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="secret-key">Key</FieldLabel>
            <Input
              id="secret-key"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
              placeholder="API_KEY"
              disabled={isEditing || isLoading}
              className="font-mono"
              autoComplete="off"
            />
            {!isEditing && (
              <FieldDescription>Uppercase letters, numbers, and underscores</FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="secret-value">Value</FieldLabel>
            {isFetchingValue ? (
              <div className="flex h-9 items-center justify-center rounded-md border border-input">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="relative">
                <Input
                  id="secret-value"
                  type={showValue ? "text" : "password"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter secret value"
                  disabled={isLoading}
                  className="pr-9 font-mono"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                  onClick={() => setShowValue(!showValue)}
                  disabled={isLoading}
                >
                  {showValue ? (
                    <EyeOff className="size-3.5 text-muted-foreground" />
                  ) : (
                    <Eye className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
              </div>
            )}
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isFetchingValue || !isFormValid}>
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : isEditing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
