import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const secretKeys = {
  all: (projectId: string, envId: string) => ['secrets', projectId, envId] as const,
  detail: (projectId: string, envId: string, secretId: string) =>
    ['secrets', projectId, envId, secretId] as const,
  versions: (projectId: string, envId: string, secretId: string) =>
    ['secrets', projectId, envId, secretId, 'versions'] as const,
};

export function useSecrets(projectId: string, envId: string) {
  return useQuery({
    queryKey: secretKeys.all(projectId, envId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/environments/${envId}/secrets`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch secrets');
      }
      return res.json();
    },
    enabled: !!projectId && !!envId,
  });
}

export function useSecretValue(projectId: string, envId: string, secretId: string | null) {
  return useQuery({
    queryKey: secretKeys.detail(projectId, envId, secretId!),
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${envId}/secrets/${secretId}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch secret');
      }
      return res.json();
    },
    enabled: !!projectId && !!envId && !!secretId,
  });
}

export function useSecretVersions(projectId: string, envId: string, secretId: string | null) {
  return useQuery({
    queryKey: secretKeys.versions(projectId, envId, secretId!),
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${envId}/secrets/${secretId}/versions`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch versions');
      }
      return res.json();
    },
    enabled: !!projectId && !!envId && !!secretId,
  });
}

export function useCreateSecret(projectId: string, envId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      const res = await fetch(`/api/projects/${projectId}/environments/${envId}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create secret');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretKeys.all(projectId, envId) });
    },
  });
}

export function useUpdateSecret(projectId: string, envId: string, secretId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { value: string }) => {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${envId}/secrets/${secretId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to update secret');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretKeys.all(projectId, envId) });
      queryClient.invalidateQueries({ queryKey: secretKeys.detail(projectId, envId, secretId) });
    },
  });
}

export function useDeleteSecret(projectId: string, envId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (secretId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${envId}/secrets/${secretId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to delete secret');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretKeys.all(projectId, envId) });
    },
  });
}

export function useRollbackSecret(projectId: string, envId: string, secretId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${envId}/secrets/${secretId}/versions/${versionId}`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to rollback');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretKeys.all(projectId, envId) });
      queryClient.invalidateQueries({ queryKey: secretKeys.versions(projectId, envId, secretId) });
    },
  });
}
