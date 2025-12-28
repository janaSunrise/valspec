"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { client } from "@/utils/orpc";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  envId: string;
  envName: string;
}

export function ExportDialog({ open, onOpenChange, projectId, envId, envName }: ExportDialogProps) {
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["secrets-export", projectId, envId],
    queryFn: () => client.secrets.export({ projectId, envId }),
    enabled: open,
  });

  const handleCopy = async () => {
    if (!data?.content) return;

    await navigator.clipboard.writeText(data.content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!data?.content) return;

    const blob = new Blob([data.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${envName.toLowerCase().replace(/\s+/g, "-")}.env`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded .env file");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Secrets</DialogTitle>
          <DialogDescription>
            Export secrets from <strong>{envName}</strong> as a .env file
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : data?.count === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No secrets to export
          </div>
        ) : (
          <>
            <div className="relative">
              <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre-wrap break-all">
                {data?.content}
              </pre>
              <div className="absolute right-2 top-2">
                <Button variant="ghost" size="icon-sm" className="size-7" onClick={handleCopy}>
                  {copied ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {data?.count} secret{data?.count !== 1 ? "s" : ""}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="mr-1.5 size-3.5" />
                  Copy
                </Button>
                <Button size="sm" onClick={handleDownload}>
                  <Download className="mr-1.5 size-3.5" />
                  Download
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
