"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { client, queryClient } from "@/utils/orpc";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  envId: string;
  envName: string;
}

export function ImportDialog({ open, onOpenChange, projectId, envId, envName }: ImportDialogProps) {
  const [content, setContent] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importSecrets = useMutation({
    mutationFn: () =>
      client.secrets.import({
        projectId,
        envId,
        content,
        overwrite,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["secrets", projectId, envId] });

      const parts: string[] = [];
      if (result.created.length > 0) {
        parts.push(`${result.created.length} created`);
      }
      if (result.updated.length > 0) {
        parts.push(`${result.updated.length} updated`);
      }
      if (result.skipped.length > 0) {
        parts.push(`${result.skipped.length} skipped`);
      }

      toast.success(`Import complete: ${parts.join(", ")}`);
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import secrets");
    },
  });

  const handleClose = () => {
    setContent("");
    setOverwrite(false);
    onOpenChange(false);
  };

  const handleFileSelect = (file: File) => {
    // .env files often have empty MIME type, so be lenient
    const isEnvFile = file.name.endsWith(".env") || file.name.startsWith(".env");
    const isTextFile = file.type === "" || file.type.includes("text");

    if (!isEnvFile && !isTextFile) {
      toast.error("Please select a .env or text file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set inactive if leaving the drop zone itself, not its children
    if (e.currentTarget === e.target) {
      setDragActive(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const lineCount = content.split("\n").filter((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("#") && trimmed.includes("=");
  }).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Secrets</DialogTitle>
          <DialogDescription>
            Import secrets from a .env file into <strong>{envName}</strong>
          </DialogDescription>
        </DialogHeader>

        {!content ? (
          <div
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            )}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Upload className="size-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Drop your .env file here</p>
              <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".env,text/plain"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Preview</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setContent("")}>
                  Clear
                </Button>
              </div>

              <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre-wrap break-all">
                {content}
              </pre>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {lineCount} secret{lineCount !== 1 ? "s" : ""} detected
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <div className="space-y-2">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Secrets with the same key already in this environment will be skipped unless you
                  enable overwrite.
                </p>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={overwrite}
                    onCheckedChange={(checked) => setOverwrite(checked === true)}
                  />
                  <span className="text-xs font-medium">Overwrite existing secrets</span>
                </label>
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => importSecrets.mutate()}
            disabled={!content || importSecrets.isPending}
          >
            {importSecrets.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Upload className="mr-1.5 size-3.5" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
