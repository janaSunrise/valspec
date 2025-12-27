"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Key, Plus, Loader2, MoreHorizontal, Trash2, Copy, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { client, queryClient } from "@/utils/orpc";

type Permission = "read" | "write" | "admin";

interface ApiKeyMetadata {
  projectId: string;
  environmentId?: string;
  permissions: Permission[];
}

interface ApiKey {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  enabled: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  lastRequest: Date | null;
  metadata: ApiKeyMetadata | null;
}

interface Project {
  id: string;
  name: string;
  environments: { id: string; name: string }[];
}

export function UserApiKeys() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => client.apiKeys.list({}),
  });

  const { data: projects } = useQuery({
    queryKey: ["projects", "list"],
    queryFn: () => client.projects.list(),
  });

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Manage API keys for programmatic access to your secrets
          </p>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            Create
          </Button>
        </div>

        {apiKeys && apiKeys.length > 0 ? (
          <div className="divide-y divide-border rounded-lg border border-border">
            {apiKeys.map((apiKey) => (
              <ApiKeyRow key={apiKey.id} apiKey={apiKey} projects={projects || []} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Key className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">No API keys yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an API key to access secrets programmatically
            </p>
          </div>
        )}
      </div>

      <CreateApiKeyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projects={projects || []}
      />
    </>
  );
}

function ApiKeyRow({ apiKey, projects }: { apiKey: ApiKey; projects: Project[] }) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const revokeApiKey = useMutation({
    mutationFn: () => client.apiKeys.revoke({ keyId: apiKey.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
      toast.success("API key revoked");
      setDeleteOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke API key");
    },
  });

  const project = projects.find((p) => p.id === apiKey.metadata?.projectId);
  const environment = project?.environments?.find((e) => e.id === apiKey.metadata?.environmentId);
  const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date();

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{apiKey.name || "Unnamed key"}</span>
            {!apiKey.enabled && (
              <Badge variant="secondary" className="text-xs">
                Disabled
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive" className="text-xs">
                Expired
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {apiKey.start && (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                {apiKey.prefix}
                {apiKey.start}...
              </code>
            )}
            {project && (
              <span>
                {project.name}
                {environment && ` / ${environment.name}`}
              </span>
            )}
            {apiKey.metadata?.permissions && (
              <span className="capitalize">{apiKey.metadata.permissions.join(", ")}</span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Created {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
            {apiKey.lastRequest && (
              <>
                {" "}
                · Last used {formatDistanceToNow(new Date(apiKey.lastRequest), { addSuffix: true })}
              </>
            )}
            {apiKey.expiresAt && !isExpired && (
              <> · Expires {formatDistanceToNow(new Date(apiKey.expiresAt), { addSuffix: true })}</>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="size-7 shrink-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Revoke key
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke the API key{" "}
              <strong>{apiKey.name || "Unnamed key"}</strong>. Any applications using this key will
              no longer be able to access secrets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeApiKey.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => revokeApiKey.mutate()}
              disabled={revokeApiKey.isPending}
            >
              {revokeApiKey.isPending ? <Loader2 className="size-4 animate-spin" /> : "Revoke"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CreateApiKeyDialog({
  open,
  onOpenChange,
  projects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
}) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [environmentId, setEnvironmentId] = useState<string>("");
  const [permissions, setPermissions] = useState<Permission[]>(["read"]);
  const [expiresIn, setExpiresIn] = useState<string>("never");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const selectedProject = projects.find((p) => p.id === projectId);
  const environments = selectedProject?.environments || [];

  // Reset environment when project changes
  const handleProjectChange = (value: string) => {
    setProjectId(value);
    setEnvironmentId("");
  };

  // Reset form when dialog closes
  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setTimeout(() => {
        setName("");
        setProjectId("");
        setEnvironmentId("");
        setPermissions(["read"]);
        setExpiresIn("never");
        setCreatedKey(null);
        setCopied(false);
        setShowKey(false);
      }, 200);
    }
  };

  const createApiKey = useMutation({
    mutationFn: () =>
      client.apiKeys.create({
        name: name.trim(),
        projectId,
        environmentId: environmentId || undefined,
        permissions,
        expiresIn: expiresIn === "never" ? undefined : parseInt(expiresIn, 10),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
      setCreatedKey(data.key);
      toast.success("API key created");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create API key");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!environmentId) {
      toast.error("Please select an environment");
      return;
    }
    createApiKey.mutate();
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePermission = (permission: Permission) => {
    if (permission === "write") {
      if (permissions.includes("write")) {
        setPermissions(permissions.filter((p) => p !== "write"));
      } else {
        setPermissions([...permissions, "write"]);
      }
    }
  };

  // Show the created key view
  if (createdKey) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all font-mono text-sm">
                  {showKey ? createdKey : createdKey.replace(/./g, "*").slice(0, 40) + "..."}
                </code>
                <Button variant="ghost" size="icon-sm" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Make sure to copy your API key now. You won't be able to see it again!
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Create an API key to access secrets programmatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="key-name">Name</FieldLabel>
            <FieldDescription>A descriptive name for this API key</FieldDescription>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CI/CD Pipeline"
              required
              disabled={createApiKey.isPending}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="project">Project</FieldLabel>
            <FieldDescription>The project this key can access</FieldDescription>
            <Select value={projectId} onValueChange={handleProjectChange}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="environment">Environment</FieldLabel>
            <FieldDescription>The environment this key can access</FieldDescription>
            <Select value={environmentId} onValueChange={setEnvironmentId} disabled={!projectId}>
              <SelectTrigger id="environment">
                <SelectValue
                  placeholder={projectId ? "Select environment" : "Select a project first"}
                />
              </SelectTrigger>
              <SelectContent>
                {environments.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Permissions</FieldLabel>
            <FieldDescription>What this key can do</FieldDescription>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="perm-read" checked={permissions.includes("read")} disabled />
                <Label htmlFor="perm-read" className="text-sm font-normal">
                  Read secrets
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="perm-write"
                  checked={permissions.includes("write")}
                  onCheckedChange={() => togglePermission("write")}
                />
                <Label htmlFor="perm-write" className="text-sm font-normal">
                  Write secrets
                </Label>
              </div>
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="expires">Expiration</FieldLabel>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger id="expires">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never expires</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createApiKey.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createApiKey.isPending || !name.trim() || !projectId || !environmentId}
            >
              {createApiKey.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
